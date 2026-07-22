import { useState, useEffect } from "react";
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
import { maskCPF, maskCNPJ } from "@/lib/masks";

type Empresa = Record<string, any>;

const empty: Empresa = {
  razao_social: "", cnpj: "", cpf_cliente: "", municipio: "", codigo_ibge: "",
  porte: "ME", modelo: "Manufatura Enxuta", consultor: "",
  codigo_tema: "", codigo_disponibilizacao: "", codigo_categoria: "", codigo_meio_atendimento: "",
  descricao: "",
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
    queryFn: async () => (await supabase.from("projetos").select("id,nome").order("nome")).data ?? [],
    enabled: open,
  });

  useEffect(() => {
    if (open) setForm(empresa ?? { ...empty, projeto_id: projetoId ?? "" });
  }, [open, empresa, projetoId]);

  async function save() {
    if (!form.projeto_id) return toast.error("Selecione um projeto");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const payload = { ...form, user_id: u.user.id, horas_previstas: Number(form.horas_previstas) || 0, horas_lancadas: Number(form.horas_lancadas) || 0 };
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
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
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
            </div>
            <div><Label>Razão Social</Label><Input value={form.razao_social} onChange={(e) => set("razao_social", e.target.value)} /></div>
            <div><Label>CNPJ</Label><Input value={form.cnpj ?? ""} onChange={(e) => set("cnpj", maskCNPJ(e.target.value))} /></div>
            <div><Label>CPF do Cliente</Label><Input value={form.cpf_cliente ?? ""} onChange={(e) => set("cpf_cliente", maskCPF(e.target.value))} /></div>
            <div><Label>Município</Label><Input value={form.municipio ?? ""} onChange={(e) => set("municipio", e.target.value)} /></div>
            <div><Label>Código IBGE</Label><Input value={form.codigo_ibge ?? ""} onChange={(e) => set("codigo_ibge", e.target.value)} /></div>
            <div>
              <Label>Porte</Label>
              <Select value={form.porte} onValueChange={(v) => set("porte", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ME">ME</SelectItem>
                  <SelectItem value="EPP">EPP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modelo</Label>
              <Select value={form.modelo} onValueChange={(v) => set("modelo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manufatura Enxuta">Manufatura Enxuta</SelectItem>
                  <SelectItem value="Eficiência Energética">Eficiência Energética</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Consultor</Label><Input value={form.consultor ?? ""} onChange={(e) => set("consultor", e.target.value)} /></div>
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

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div><Label>Cód. Tema</Label><Input value={form.codigo_tema ?? ""} onChange={(e) => set("codigo_tema", e.target.value)} /></div>
            <div><Label>Cód. Disponibilização</Label><Input value={form.codigo_disponibilizacao ?? ""} onChange={(e) => set("codigo_disponibilizacao", e.target.value)} /></div>
            <div><Label>Cód. Categoria</Label><Input value={form.codigo_categoria ?? ""} onChange={(e) => set("codigo_categoria", e.target.value)} /></div>
            <div><Label>Cód. Meio Atendimento</Label><Input value={form.codigo_meio_atendimento ?? ""} onChange={(e) => set("codigo_meio_atendimento", e.target.value)} /></div>
          </div>

          <div><Label>Descrição</Label><Textarea value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} /></div>

          <div>
            <Label className="mb-2 block">Etapas concluídas</Label>
            <div className="flex flex-wrap gap-4">
              {["t0", "t1", "t2", "t3", "t4"].map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={!!form[`etapa_${t}`]} onCheckedChange={(v) => set(`etapa_${t}`, !!v)} />
                  {t.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Horas previstas</Label><Input type="number" step="0.5" value={form.horas_previstas} onChange={(e) => set("horas_previstas", e.target.value)} /></div>
            <div><Label>Horas lançadas</Label><Input type="number" step="0.5" value={form.horas_lancadas} onChange={(e) => set("horas_lancadas", e.target.value)} /></div>
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
