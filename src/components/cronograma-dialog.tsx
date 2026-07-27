import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ETAPAS, MAX_HORAS_DIA, blocosPorEtapa, gerarDatas, parseISO, proximoAposDiaUtil, toISO, type Etapa,
} from "@/lib/horas";
import { AtendimentoValidacaoService } from "@/lib/services/atendimento-validacao.service";
import { maskCPF, onlyDigits } from "@/lib/masks";


type Projeto = any;
type Empresa = any;

type Linha = {
  data: string;
  horas: number;
  etapa: string;
  descricao: string;
};

export function CronogramaDialog({
  open, onOpenChange, projeto, empresas,
}: { open: boolean; onOpenChange: (v: boolean) => void; projeto: Projeto; empresas: Empresa[] }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [porEmpresa, setPorEmpresa] = useState<Record<string, Linha[]>>({});
  // Consultor por empresa — permite que empresas do mesmo projeto tenham consultores diferentes.
  // Default: herda cpf_consultor/consultor do projeto (compatibilidade).
  const [consultorPorEmpresa, setConsultorPorEmpresa] = useState<
    Record<string, { consultor: string; cpf_consultor: string }>
  >({});

  const alvos = useMemo(
    () => empresas.filter((e) => ETAPAS.some((t) => e[`etapa_${t.toLowerCase()}`])),
    [empresas],
  );

  useEffect(() => {
    if (!open) return;
    const inicial: Record<string, Linha[]> = {};
    const cons: Record<string, { consultor: string; cpf_consultor: string }> = {};
    for (const e of alvos) {
      const etapasSel = ETAPAS.filter((t) => e[`etapa_${t.toLowerCase()}`]) as Etapa[];
      const blocos = blocosPorEtapa(projeto.modelo, e.porte, etapasSel);
      const base = e.ultima_data
        ? proximoAposDiaUtil(parseISO(e.ultima_data))
        : projeto.data_inicial
          ? parseISO(projeto.data_inicial)
          : new Date();
      const datas = gerarDatas(base, blocos.length);
      inicial[e.id] = blocos.map((b, i) => ({
        data: datas[i],
        horas: b.horas,
        etapa: b.etapa,
        descricao: projeto.descricao_padrao ?? "",
      }));
      cons[e.id] = {
        consultor: projeto.consultor ?? "",
        cpf_consultor: projeto.cpf_consultor ?? "",
      };
    }
    setPorEmpresa(inicial);
    setConsultorPorEmpresa(cons);
  }, [open, alvos, projeto]);


  function updateLinha(empresaId: string, idx: number, patch: Partial<Linha>) {
    setPorEmpresa((s) => {
      const arr = [...(s[empresaId] ?? [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...s, [empresaId]: arr };
    });
  }
  function removerLinha(empresaId: string, idx: number) {
    setPorEmpresa((s) => ({ ...s, [empresaId]: (s[empresaId] ?? []).filter((_, i) => i !== idx) }));
  }
  function adicionarLinha(empresaId: string) {
    setPorEmpresa((s) => {
      const arr = [...(s[empresaId] ?? [])];
      const ultima = arr[arr.length - 1]?.data;
      const prox = ultima ? toISO(proximoAposDiaUtil(parseISO(ultima))) : toISO(new Date());
      arr.push({ data: prox, horas: MAX_HORAS_DIA, etapa: "T2", descricao: projeto.descricao_padrao ?? "" });
      return { ...s, [empresaId]: arr };
    });
  }
  function mover(empresaId: string, idx: number, dir: -1 | 1) {
    setPorEmpresa((s) => {
      const arr = [...(s[empresaId] ?? [])];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return s;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...s, [empresaId]: arr };
    });
  }

  const totalAtend = Object.values(porEmpresa).reduce((s, a) => s + a.length, 0);
  const totalHrs = Object.values(porEmpresa).reduce((s, a) => s + a.reduce((x, l) => x + Number(l.horas || 0), 0), 0);

  async function salvar() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    // validações
    for (const arr of Object.values(porEmpresa)) {
      for (const l of arr) {
        if (Number(l.horas) > MAX_HORAS_DIA) return toast.error("Nenhum atendimento pode ter mais de 8h");
        if (Number(l.horas) <= 0) return toast.error("Horas devem ser maiores que zero");
      }
    }
    setSaving(true);

    // Cria geração
    const { data: ger, error: errGer } = await supabase
      .from("cronograma_geracoes")
      .insert({
        user_id: u.user.id,
        projeto_id: projeto.id,
        usuario: u.user.email,
        total_empresas: Object.keys(porEmpresa).length,
        total_atendimentos: totalAtend,
        total_horas: totalHrs,
      })
      .select()
      .single();
    if (errGer || !ger) { setSaving(false); return toast.error(errGer?.message ?? "Erro ao registrar geração"); }

    // Linhas
    const linhas: any[] = [];
    for (const empresaId of Object.keys(porEmpresa)) {
      const e = alvos.find((x) => x.id === empresaId);
      const arr = porEmpresa[empresaId];
      arr.forEach((l, idx) => {
        linhas.push({
          user_id: u.user!.id,
          projeto_id: projeto.id,
          empresa_id: empresaId,
          geracao_id: ger.id,
          data: l.data,
          horas: Number(l.horas) || 0,
          etapa: l.etapa,
          ordem: idx,
          consultor: projeto.consultor,
          cpf_consultor: projeto.cpf_consultor,
          municipio: projeto.municipio,
          codigo_ibge: projeto.codigo_ibge,
          codigo_tema: projeto.codigo_tema,
          codigo_categoria: projeto.codigo_categoria,
          codigo_meio_atendimento: projeto.codigo_meio_atendimento,
          codigo_disponibilizacao: projeto.codigo_disponibilizacao,
          descricao: l.descricao,
        });
      });

      // Atualiza horas_lancadas e ultima_data na empresa
      const totalEmpresa = arr.reduce((s, l) => s + Number(l.horas || 0), 0);
      const ultima = arr.map((l) => l.data).sort().at(-1);
      await supabase.from("empresas").update({
        horas_lancadas: (Number(e?.horas_lancadas) || 0) + totalEmpresa,
        ultima_data: ultima ?? e?.ultima_data ?? null,
      }).eq("id", empresaId);
    }

    if (linhas.length) {
      const { error: errLin } = await supabase.from("cronogramas").insert(linhas);
      if (errLin) { setSaving(false); return toast.error(errLin.message); }
    }

    // Histórico
    await supabase.from("historico").insert({
      user_id: u.user.id,
      projeto_id: projeto.id,
      projeto_nome: projeto.nome,
      empresa_nome: `${Object.keys(porEmpresa).length} empresa(s)`,
      usuario: u.user.email,
      status: "cronograma_gerado",
      observacoes: `${totalAtend} atendimento(s) · ${totalHrs}h`,
    });

    setSaving(false);
    toast.success("Cronograma salvo");
    qc.invalidateQueries();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pré-visualização do cronograma</DialogTitle>
        </DialogHeader>

        {alvos.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma empresa com etapas selecionadas.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 rounded-md border p-3 text-sm">
              <div><div className="text-xs text-muted-foreground">Empresas</div><div className="text-lg font-semibold">{Object.keys(porEmpresa).length}</div></div>
              <div><div className="text-xs text-muted-foreground">Atendimentos</div><div className="text-lg font-semibold">{totalAtend}</div></div>
              <div><div className="text-xs text-muted-foreground">Total de horas</div><div className="text-lg font-semibold">{totalHrs}h</div></div>
            </div>

            {alvos.map((e) => {
              const arr = porEmpresa[e.id] ?? [];
              const sub = arr.reduce((s, l) => s + Number(l.horas || 0), 0);
              return (
                <div key={e.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{e.razao_social}</div>
                      <div className="text-xs text-muted-foreground">{e.porte} · {arr.length} atend. · {sub}h</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => adicionarLinha(e.id)}>
                      <Plus className="h-4 w-4" /> Linha
                    </Button>
                  </div>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead className="w-40">Data</TableHead>
                          <TableHead className="w-24">Horas</TableHead>
                          <TableHead className="w-24">Etapa</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="w-32" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {arr.map((l, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell><Input type="date" value={l.data} onChange={(ev) => updateLinha(e.id, idx, { data: ev.target.value })} /></TableCell>
                            <TableCell>
                              <Input type="number" step="0.5" max={MAX_HORAS_DIA} value={l.horas}
                                onChange={(ev) => updateLinha(e.id, idx, { horas: Math.min(MAX_HORAS_DIA, Number(ev.target.value) || 0) })} />
                            </TableCell>
                            <TableCell>
                              <Select value={l.etapa} onValueChange={(v) => updateLinha(e.id, idx, { etapa: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ETAPAS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell><Input value={l.descricao} onChange={(ev) => updateLinha(e.id, idx, { descricao: ev.target.value })} /></TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button size="icon" variant="ghost" onClick={() => mover(e.id, idx, -1)}><ArrowUp className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => mover(e.id, idx, 1)}><ArrowDown className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => removerLinha(e.id, idx)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving || alvos.length === 0}>{saving ? "Salvando…" : "Confirmar e salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
