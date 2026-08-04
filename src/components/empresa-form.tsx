import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { maskCPF, maskCNPJ, onlyDigits } from "@/lib/masks";
import { ETAPAS, etapasDoModelo, modeloValidaPorte, totalHoras, type Etapa } from "@/lib/horas";

type Empresa = Record<string, any>;

const empty: Empresa = {
  razao_social: "", cnpj: "", cpf_cliente: "", porte: "ME",
  consultor: "", cpf_consultor: "",
  etapa_t0: false, etapa_t1: false, etapa_t2: false, etapa_t3: false, etapa_t4: false,
  horas_previstas: 0, horas_lancadas: 0,
  status: "pendente", observacoes: "", projeto_id: "",
};

export function EmpresaForm({
  trigger, empresa, projetoId, onSaved,
}: { trigger: React.ReactNode; empresa?: Empresa; projetoId?: string; onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Empresa>(empty);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const { data: projetos } = useQuery({
    queryKey: ["projetos-select"],
    queryFn: async () => (await supabase.from("projetos").select("id,nome,modelo,consultor,cpf_consultor").order("nome")).data ?? [],
    enabled: open,
  });

  useEffect(() => {
    if (open) setForm(empresa ?? { ...empty, projeto_id: projetoId ?? "" });
  }, [open, empresa, projetoId]);

  const projetoSel = projetos?.find((p) => p.id === form.projeto_id);
  const etapasDisponiveis = useMemo(() => etapasDoModelo(projetoSel?.modelo), [projetoSel?.modelo]);
  const validaPorte = modeloValidaPorte(projetoSel?.modelo);
  const etapasSel = useMemo(
    () => etapasDisponiveis.filter((t) => form[`etapa_${t.toLowerCase()}`]) as Etapa[],
    [form, etapasDisponiveis],
  );
  const previstasCalc = useMemo(
    () => totalHoras(projetoSel?.modelo, form.porte, etapasSel),
    [projetoSel?.modelo, form.porte, etapasSel],
  );
  const restantes = Math.max(0, previstasCalc - Number(form.horas_lancadas || 0));

  async function save() {
    if (!form.projeto_id) return toast.error("Selecione um projeto");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const payload: any = {
      ...form,
      user_id: u.user.id,
      horas_previstas: previstasCalc,
      horas_lancadas: Number(form.horas_lancadas) || 0,
    };
    const { error } = form.id
      ? await supabase.from("empresas").update(payload).eq("id", form.id)
      : await supabase.from("empresas").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Empresa atualizada" : "Empresa cadastrada");
    qc.invalidateQueries();
    setOpen(false);
    onSaved?.();
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? "Editar empresa" : "Nova empresa"}</DialogTitle></DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Projeto</Label>
              <Select value={form.projeto_id} onValueChange={(v) => set("projeto_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {projetos?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {projetoSel?.modelo && <div className="mt-1 text-xs text-muted-foreground">Modelo: {projetoSel.modelo}</div>}
            </div>
            <div className={validaPorte ? "" : "hidden"}>
              <Label>Porte</Label>
              <Select value={form.porte} onValueChange={(v) => set("porte", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ME">ME</SelectItem>
                  <SelectItem value="EPP">EPP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Razão Social</Label><Input value={form.razao_social} onChange={(e) => set("razao_social", e.target.value)} /></div>
            <div><Label>CNPJ</Label><Input value={form.cnpj ?? ""} onChange={(e) => set("cnpj", maskCNPJ(e.target.value))} /></div>
            <div><Label>CPF do Cliente</Label><Input value={form.cpf_cliente ?? ""} onChange={(e) => set("cpf_cliente", maskCPF(e.target.value))} /></div>
            <div>
              <Label>Consultor responsável</Label>
              <Input
                value={form.consultor ?? ""}
                placeholder={projetoSel?.consultor ?? "Nome do consultor"}
                onChange={(e) => set("consultor", e.target.value)}
              />
            </div>
            <div>
              <Label>CPF do consultor</Label>
              <Input
                value={maskCPF(form.cpf_consultor ?? "")}
                placeholder={projetoSel?.cpf_consultor ? maskCPF(projetoSel.cpf_consultor) : "000.000.000-00"}
                onChange={(e) => set("cpf_consultor", onlyDigits(e.target.value))}
              />
              <div className="mt-1 text-xs text-muted-foreground">
                Usado nos atendimentos desta empresa e na validação de conflito de agenda.
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Etapas concluídas</Label>
            <div className="flex flex-wrap gap-4">
              {etapasDisponiveis.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!form[`etapa_${t.toLowerCase()}`]}
                    onCheckedChange={(v) => set(`etapa_${t.toLowerCase()}`, !!v)}
                  />
                  {t}
                </label>
              ))}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {validaPorte ? "Horas calculadas automaticamente conforme modelo e porte." : "Modelo Alvo: 2 etapas de 2h cada, sem diferenciação de porte."}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-md border p-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Previstas</div><div className="text-lg font-semibold">{previstasCalc}h</div></div>
            <div>
              <div className="text-xs text-muted-foreground">Lançadas</div>
              <Input type="number" step="0.5" value={form.horas_lancadas ?? 0} onChange={(e) => set("horas_lancadas", e.target.value)} />
            </div>
            <div><div className="text-xs text-muted-foreground">Restantes</div><div className="text-lg font-semibold">{restantes}h</div></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Última data de atendimento</Label><Input type="date" value={form.ultima_data ?? ""} onChange={(e) => set("ultima_data", e.target.value || null)} /></div>
          </div>

          <div><Label>Observações</Label><Textarea value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} /></div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.razao_social}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
