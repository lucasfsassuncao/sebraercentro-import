import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MAX_HORAS_DIA } from "@/lib/horas";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/cronogramas/$geracaoId")({
  head: () => ({ meta: [{ title: "Cronograma — Gestor Sebrae" }, { name: "description", content: "Detalhes do cronograma gerado." }] }),
  component: CronogramaDetail,
});

function CronogramaDetail() {
  const { geracaoId } = Route.useParams();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["cronograma-detail", geracaoId],
    queryFn: async () => {
      const [{ data: g }, { data: linhas }, { data: empresas }] = await Promise.all([
        supabase.from("cronograma_geracoes").select("*").eq("id", geracaoId).maybeSingle(),
        supabase.from("cronogramas").select("*").eq("geracao_id", geracaoId).order("data").order("ordem"),
        supabase.from("empresas").select("id,razao_social"),
      ]);
      return { geracao: g, linhas: linhas ?? [], empresas: empresas ?? [] };
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
    for (const r of rows) if (Number(r.horas) > MAX_HORAS_DIA) return toast.error("Nenhum atendimento pode passar de 8h");
    // Atualiza cada linha existente; identifica removidas.
    const original = data.linhas;
    const idsAtuais = new Set(rows.map((r) => r.id));
    const removidas = original.filter((o) => !idsAtuais.has(o.id));
    for (const r of rows) {
      const { error } = await supabase.from("cronogramas").update({
        data: r.data, horas: Number(r.horas), etapa: r.etapa, descricao: r.descricao,
      }).eq("id", r.id);
      if (error) return toast.error(error.message);
    }
    for (const r of removidas) await supabase.from("cronogramas").delete().eq("id", r.id);

    // Atualiza contadores da geração
    const totalHrs = rows.reduce((s, r) => s + Number(r.horas || 0), 0);
    await supabase.from("cronograma_geracoes").update({
      total_atendimentos: rows.length, total_horas: totalHrs,
    }).eq("id", geracaoId);

    toast.success("Cronograma atualizado");
    qc.invalidateQueries();
  }

  async function excluirGeracao() {
    const { error } = await supabase.from("cronograma_geracoes").delete().eq("id", geracaoId);
    if (error) return toast.error(error.message);
    toast.success("Geração removida");
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
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline"><Trash2 className="h-4 w-4" /> Excluir</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Excluir cronograma?</AlertDialogTitle></AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={excluirGeracao}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={salvar}><Save className="h-4 w-4" /> Salvar alterações</Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead className="w-40">Data</TableHead>
              <TableHead className="w-24">Horas</TableHead>
              <TableHead className="w-24">Etapa</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma linha.</TableCell></TableRow>}
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{empresaNome(r.empresa_id)}</TableCell>
                <TableCell><Input type="date" value={r.data ?? ""} onChange={(e) => updateRow(i, { data: e.target.value })} /></TableCell>
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
