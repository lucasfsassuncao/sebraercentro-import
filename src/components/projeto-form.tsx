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

type Projeto = {
  id?: string;
  nome: string;
  municipio: string | null;
  consultor: string | null;
  modelo: string | null;
  status: string;
  observacoes: string | null;
};

const empty: Projeto = { nome: "", municipio: "", consultor: "", modelo: "Manufatura Enxuta", status: "ativo", observacoes: "" };

export function ProjetoForm({ trigger, projeto, onSaved }: { trigger: React.ReactNode; projeto?: Projeto; onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Projeto>(empty);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (open) setForm(projeto ?? empty);
  }, [open, projeto]);

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const payload = { ...form, user_id: u.user.id };
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
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{form.id ? "Editar projeto" : "Novo projeto"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Município</Label><Input value={form.municipio ?? ""} onChange={(e) => setForm({ ...form, municipio: e.target.value })} /></div>
            <div><Label>Consultor</Label><Input value={form.consultor ?? ""} onChange={(e) => setForm({ ...form, consultor: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Modelo</Label>
              <Select value={form.modelo ?? ""} onValueChange={(v) => setForm({ ...form, modelo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manufatura Enxuta">Manufatura Enxuta</SelectItem>
                  <SelectItem value="Eficiência Energética">Eficiência Energética</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Observações</Label><Textarea value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.nome}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
