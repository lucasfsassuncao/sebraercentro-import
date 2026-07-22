import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FolderKanban, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ProjetoForm } from "@/components/projeto-form";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/projetos/")({
  head: () => ({ meta: [{ title: "Projetos — Gestor Sebrae" }, { name: "description", content: "Seus projetos de atendimento." }] }),
  component: ProjetosList,
});

function ProjetosList() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["projetos"],
    queryFn: async () => (await supabase.from("projetos").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const filtered = (data ?? []).filter((p) =>
    [p.nome, p.municipio, p.modelo, p.consultor].filter(Boolean).some((v) => v!.toLowerCase().includes(q.toLowerCase()))
  );

  async function remove(id: string) {
    const { error } = await supabase.from("projetos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Projeto removido");
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus projetos de atendimento.</p>
        </div>
        <ProjetoForm trigger={<Button><Plus className="h-4 w-4" /> Novo projeto</Button>} />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar projetos…" className="pl-9" />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="grid place-items-center gap-2 p-12 text-center">
          <FolderKanban className="h-10 w-10 text-muted-foreground" />
          <div className="font-medium">Nenhum projeto encontrado</div>
          <div className="text-sm text-muted-foreground">Crie seu primeiro projeto para começar.</div>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="group transition hover:shadow-md">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link to="/projetos/$id" params={{ id: p.id }} className="text-lg font-semibold hover:underline">{p.nome}</Link>
                  <Badge variant={p.status === "ativo" ? "default" : "secondary"}>{p.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {p.municipio ?? "—"} · {p.modelo ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground">Consultor: {p.consultor ?? "—"}</div>
                <div className="flex justify-end gap-1 pt-2 opacity-0 transition group-hover:opacity-100">
                  <ProjetoForm projeto={p} trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover projeto?</AlertDialogTitle>
                        <AlertDialogDescription>Isso também removerá todas as empresas vinculadas.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(p.id)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
