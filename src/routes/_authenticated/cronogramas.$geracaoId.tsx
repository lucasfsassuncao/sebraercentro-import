import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save, Trash2, FileSpreadsheet } from "lucide-react";
import { ExportService } from "@/lib/export/export-service";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MAX_HORAS_DIA, ETAPAS, HORARIOS_ATENDIMENTO, totalHoras, type Etapa } from "@/lib/horas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  validarLinhasCronograma,
  recalcularHorasEmpresa,
} from "@/lib/motor-cronogramas";

export const Route = createFileRoute("/_authenticated/cronogramas/$geracaoId")({
  head: () => ({ meta: [{ title: "Cronograma — Gestor Sebrae" }, { name: "description", content: "Detalhes do cronograma gerado." }] }),
  component: CronogramaDetail,
});

function CronogramaDetail() {
  const { geracaoId } = Route.useParams();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["cronograma-detail", geracaoId],
    queryFn: async () => {
      const { data: g } = await supabase.from("cronograma_geracoes").select("*").eq("id", geracaoId).maybeSingle();
      if (!g) return { geracao: null, linhas: [], empresas: [], projeto: null };

      const [{ data: linhas }, { data: empresas }, { data: proj }] = await Promise.all([
        supabase.from("cronogramas").select("*").eq("geracao_id", geracaoId).order("data").order("ordem"),
        supabase.from("empresas").select("*").eq("projeto_id", g.projeto_id),
        supabase.from("projetos").select("*").eq("id", g.projeto_id).maybeSingle(),
      ]);
      return { geracao: g, linhas: linhas ?? [], empresas: empresas ?? [], projeto: proj };
    },
  });

  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { if (data?.linhas) setRows(data.linhas); }, [data?.linhas]);

  if (!data?.geracao) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const empresaNome = (id: string) => data.empresas.find((e) => e.id === id)?.razao_social ?? "—";

  function updateRow(idx: number, patch: any) {
    setRows((rs) => rs.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }
  function removeRow(idx: number) { setRows((rs) => rs.filter((_, i) => i !== idx)); }

  async function salvar() {
    setSaving(true);

    // Agrupa as linhas por empresa para validação individual
    const linhasPorEmpresa: Record<string, typeof rows> = {};
    for (const r of rows) {
      if (!linhasPorEmpresa[r.empresa_id]) {
        linhasPorEmpresa[r.empresa_id] = [];
      }
      linhasPorEmpresa[r.empresa_id].push(r);
    }

    // Identifica quais empresas foram afetadas (tanto no salvamento quanto na remoção)
    const original = data?.linhas ?? [];
    const idsAtuais = new Set(rows.map((r) => r.id));
    const removidas = original.filter((o) => !idsAtuais.has(o.id));
    const empresasAfetadas = new Set<string>();
    for (const r of rows) empresasAfetadas.add(r.empresa_id);
    for (const r of removidas) empresasAfetadas.add(r.empresa_id);

    // Validações por empresa usando o motor inteligente
    for (const empresaId of Object.keys(linhasPorEmpresa)) {
      const e = data?.empresas.find((x) => x.id === empresaId) as any;
      const arr = linhasPorEmpresa[empresaId];
      if (!e) continue;

      const etapasSel = ETAPAS.filter((t) => e[`etapa_${t.toLowerCase()}`]) as Etapa[];
      const modeloEfetivo = e.modelo || data?.projeto?.modelo;
      const porteEfetivo = e.porte || "ME";
      const totalPrevisto = totalHoras(modeloEfetivo, porteEfetivo, etapasSel);

      const val = validarLinhasCronograma(arr, totalPrevisto);
      if (!val.valido) {
        setSaving(false);
        return toast.error(`${e.razao_social}: ${val.mensagem || val.message}`);
      }
    }

    // Salva as alterações das linhas existentes
    for (const r of rows) {
      const { error } = await supabase.from("cronogramas").update({
        data: r.data, hora: r.hora || null, horas: Number(r.horas), etapa: r.etapa, descricao: r.descricao,
      }).eq("id", r.id);
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
    }
    
    // Remove as linhas deletadas
    for (const r of removidas) {
      const { error } = await supabase.from("cronogramas").delete().eq("id", r.id);
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
    }

    // Atualiza contadores da geração
    const totalHrs = rows.reduce((s, r) => s + Number(r.horas || 0), 0);
    await supabase.from("cronograma_geracoes").update({
      total_atendimentos: rows.length, total_horas: totalHrs,
    }).eq("id", geracaoId);

    // Recalcula horas no banco para cada empresa afetada
    for (const id of empresasAfetadas) {
      await recalcularHorasEmpresa(id);
    }

    setSaving(false);
    toast.success("Cronograma atualizado com sucesso");
    qc.invalidateQueries();
  }

  async function excluirGeracao() {
    setSaving(true);
    
    // 1. Identifica todas as empresas afetadas pela geração atual
    const empresasAfetadas = new Set<string>(rows.map(r => r.empresa_id));
    
    // 2. Remove todas as linhas de atendimento dessa geração primeiro para evitar órfãos
    const { error: errLinhas } = await supabase
      .from("cronogramas")
      .delete()
      .eq("geracao_id", geracaoId);
    
    if (errLinhas) {
      setSaving(false);
      return toast.error(errLinhas.message);
    }
    
    // 3. Remove o registro da geração
    const { error: errGer } = await supabase
      .from("cronograma_geracoes")
      .delete()
      .eq("id", geracaoId);
      
    if (errGer) {
      setSaving(false);
      return toast.error(errGer.message);
    }
    
    // 4. Recalcula as horas e última data no banco para todas as empresas participantes
    for (const id of empresasAfetadas) {
      await recalcularHorasEmpresa(id);
    }

    setSaving(false);
    toast.success("Geração removida com sucesso");
    qc.invalidateQueries();
    history.back();
  }

  const totalHrs = rows.reduce((s, r) => s + Number(r.horas || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/cronogramas"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cronograma</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(data.geracao.created_at).toLocaleString()} · {data.geracao.usuario ?? "—"} ·
              {" "}{rows.length} atend. · {totalHrs}h
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={saving} onClick={async () => {
            setSaving(true);
            const r = await ExportService.exportarGeracao(geracaoId);
            setSaving(false);
            if (r.ok) {
              toast.success(`Exportado: ${r.filename} (${r.quantidade} registros)`);
              qc.invalidateQueries();
            } else {
              toast.error(r.mensagem || "Falha na exportação");
              if (r.erros?.length) {
                r.erros.slice(0, 5).forEach((e) => toast.error(`Linha ${e.linha} · ${e.campo}: ${e.mensagem}`));
              }
            }
          }}>
            <FileSpreadsheet className="h-4 w-4" /> Exportar Consultorias
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" disabled={saving}><Trash2 className="h-4 w-4" /> Excluir</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Excluir cronograma?</AlertDialogTitle></AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={excluirGeracao}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={salvar} disabled={saving}><Save className="h-4 w-4" /> {saving ? "Salvando…" : "Salvar alterações"}</Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead className="w-40">Data</TableHead>
              <TableHead className="w-28">Horário</TableHead>
              <TableHead className="w-24">Horas</TableHead>
              <TableHead className="w-24">Etapa</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhuma linha.</TableCell></TableRow>}
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{empresaNome(r.empresa_id)}</TableCell>
                <TableCell><Input type="date" value={r.data ?? ""} onChange={(e) => updateRow(i, { data: e.target.value })} /></TableCell>
                <TableCell>
                  <Select value={r.hora ?? "sem"} onValueChange={(v) => updateRow(i, { hora: v === "sem" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem">—</SelectItem>
                      {HORARIOS_ATENDIMENTO.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Input type="number" step="0.5" max={MAX_HORAS_DIA} value={r.horas ?? 0} onChange={(e) => updateRow(i, { horas: Math.min(MAX_HORAS_DIA, Number(e.target.value) || 0) })} /></TableCell>
                <TableCell><Input value={r.etapa ?? ""} onChange={(e) => updateRow(i, { etapa: e.target.value })} /></TableCell>
                <TableCell><Input value={r.descricao ?? ""} onChange={(e) => updateRow(i, { descricao: e.target.value })} /></TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => removeRow(i)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
