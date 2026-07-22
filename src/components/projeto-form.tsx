import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { maskCPF } from "@/lib/masks";

type Projeto = Record<string, any>;

const empty: Projeto = {
  nome: "", municipio: "", codigo_ibge: "", consultor: "", cpf_consultor: "",
  modelo: "Manufatura Enxuta", status: "ativo",
  codigo_tema: "", codigo_disponibilizacao: "", codigo_categoria: "", codigo_meio_atendimento: "",
  descricao_padrao: "", data_inicial: "", observacoes: "",
};

export function ProjetoForm({ trigger, projeto, onSaved }: { trigger: React.ReactNode; projeto?: Projeto; onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Projeto>(empty);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (open) setForm(projeto ? { ...empty, ...projeto } : empty);
  }, [open, projeto]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const payload: any = { ...form, user_id: u.user.id, data_inicial: form.data_inicial || null };
    const { error } = form.id
      ? await supabase.from("projetos").update(payload).eq("id", form.id)
      : await supabase.from("projetos").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Projeto atualizado" : "Projeto criado");
    qc.invalidateQueries();
    setOpen(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? "Editar projeto" : "Novo projeto"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><Label>Nome do projeto</Label><Input value={form.nome} onChange={(e) => set("nome", e.target.value)} /></div>
            <div>
              <Label>Modelo</Label>
              <Select value={form.modelo ?? ""} onValueChange={(v) => set("modelo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manufatura Enxuta">Manufatura Enxuta</SelectItem>
                  <SelectItem value="Eficiência Energética">Eficiência Energética</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Município</Label><Input value={form.municipio ?? ""} onChange={(e) => set("municipio", e.target.value)} /></div>
            <div><Label>Código IBGE</Label><Input value={form.codigo_ibge ?? ""} onChange={(e) => set("codigo_ibge", e.target.value)} /></div>
            <div><Label>Consultor responsável</Label><Input value={form.consultor ?? ""} onChange={(e) => set("consultor", e.target.value)} /></div>
            <div><Label>CPF do consultor</Label><Input value={form.cpf_consultor ?? ""} onChange={(e) => set("cpf_consultor", maskCPF(e.target.value))} /></div>
            <div><Label>Data inicial</Label><Input type="date" value={form.data_inicial ?? ""} onChange={(e) => set("data_inicial", e.target.value)} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
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

          <div><Label>Descrição padrão dos atendimentos</Label><Textarea rows={3} value={form.descricao_padrao ?? ""} onChange={(e) => set("descricao_padrao", e.target.value)} /></div>
          <div><Label>Observações</Label><Textarea value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.nome}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
