import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { maskCPF } from "@/lib/masks";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Gestor Sebrae" }, { name: "description", content: "Padrões e listas usadas nas automações." }] }),
  component: Configuracoes,
});

type Cfg = {
  cpf_consultor: string;
  descricao_padrao: string;
  municipios: string[];
  modelos: string[];
  temas: string[];
};

const empty: Cfg = { cpf_consultor: "", descricao_padrao: "", municipios: [], modelos: [], temas: [] };

function Configuracoes() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("configuracoes").select("*").eq("user_id", u.user.id).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState<Cfg>(empty);

  useEffect(() => {
    if (data) {
      setForm({
        cpf_consultor: data.cpf_consultor ?? "",
        descricao_padrao: data.descricao_padrao ?? "",
        municipios: (data.municipios as string[]) ?? [],
        modelos: (data.modelos as string[]) ?? [],
        temas: (data.temas as string[]) ?? [],
      });
    }
  }, [data]);

  async function save() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("configuracoes").upsert({ user_id: u.user.id, ...form });
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["configuracoes"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Padrões utilizados nas futuras automações.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Padrões do consultor</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>CPF padrão</Label><Input value={form.cpf_consultor} onChange={(e) => setForm({ ...form, cpf_consultor: maskCPF(e.target.value) })} /></div>
            <div><Label>Descrição padrão</Label><Textarea rows={5} value={form.descricao_padrao} onChange={(e) => setForm({ ...form, descricao_padrao: e.target.value })} /></div>
          </CardContent>
        </Card>

        <ListEditor title="Municípios" items={form.municipios} onChange={(v) => setForm({ ...form, municipios: v })} />
        <ListEditor title="Modelos" items={form.modelos} onChange={(v) => setForm({ ...form, modelos: v })} />
        <ListEditor title="Temas" items={form.temas} onChange={(v) => setForm({ ...form, temas: v })} />
      </div>

      <div className="flex justify-end"><Button onClick={save}>Salvar configurações</Button></div>
    </div>
  );
}

function ListEditor({ title, items, onChange }: { title: string; items: string[]; onChange: (v: string[]) => void }) {
  const [v, setV] = useState("");
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={`Adicionar em ${title.toLowerCase()}…`} />
          <Button type="button" size="icon" onClick={() => { if (v.trim()) { onChange([...items, v.trim()]); setV(""); } }}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.length === 0 && <div className="text-sm text-muted-foreground">Nenhum item.</div>}
          {items.map((it, idx) => (
            <Badge key={idx} variant="secondary" className="gap-1">
              {it}
              <button onClick={() => onChange(items.filter((_, i) => i !== idx))}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
