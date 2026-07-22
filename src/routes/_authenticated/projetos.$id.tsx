import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { EmpresaForm } from "@/components/empresa-form";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/projetos/$id")({
  head: () => ({ meta: [{ title: "Projeto — Gestor Sebrae" }, { name: "description", content: "Detalhes do projeto e empresas." }] }),
  component: ProjetoDetail,
});

function ProjetoDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["projeto", id],
    queryFn: async () => {
      const [{ data: p }, { data: es }] = await Promise.all([
        supabase.from("projetos").select("*").eq("id", id).maybeSingle(),
        supabase.from("empresas").select("*").eq("projeto_id", id).order("razao_social"),
      ]);
      return { projeto: p, empresas: es ?? [] };
    },
  });

  const p = data?.projeto;
  const empresas = data?.empresas ?? [];

  async function remove(empresaId: string) {
    const { error } = await supabase.from("empresas").delete().eq("id", empresaId);
    if (error) return toast.error(error.message);
    toast.success("Empresa removida");
    qc.invalidateQueries();
  }

  const totalPrev = empresas.reduce((s, e) => s + Number(e.horas_previstas ?? 0), 0);
  const totalLanc = empresas.reduce((s, e) => s + Number(e.horas_lancadas ?? 0), 0);
  const concluidas = empresas.filter((e) => e.status === "concluida").length;
  const pct = empresas.length ? Math.round((concluidas / empresas.length) * 100) : 0;

  if (!p) return <div className="text-sm text-muted-foreground">Carregando projeto…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/projetos"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{p.nome}</h1>
            <p className="text-sm text-muted-foreground">{p.municipio ?? "—"} · {p.modelo ?? "—"} · Consultor: {p.consultor ?? "—"}</p>
          </div>
        </div>
        <EmpresaForm projetoId={p.id} trigger={<Button><Plus className="h-4 w-4" /> Nova empresa</Button>} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { l: "Empresas", v: empresas.length },
          { l: "Concluídas", v: concluidas },
          { l: "Horas previstas", v: totalPrev },
          { l: "Horas lançadas", v: totalLanc },
        ].map((c) => (
          <Card key={c.l}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{c.l}</div>
            <div className="text-2xl font-bold">{c.v}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-2 flex justify-between text-sm"><span>Progresso do projeto</span><span>{pct}%</span></div>
          <Progress value={pct} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Porte</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último atend.</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.length === 0 && (
                <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Nenhuma empresa cadastrada.</TableCell></TableRow>
              )}
              {empresas.map((e) => {
                const etapas = [e.etapa_t0, e.etapa_t1, e.etapa_t2, e.etapa_t3, e.etapa_t4].filter(Boolean).length;
                const empresaPct = Math.round((etapas / 5) * 100);
                const restantes = Number(e.horas_previstas ?? 0) - Number(e.horas_lancadas ?? 0);
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.razao_social}</TableCell>
                    <TableCell className="text-xs">{e.cnpj || "—"}</TableCell>
                    <TableCell className="text-xs">{e.modelo}</TableCell>
                    <TableCell><Badge variant="outline">{e.porte}</Badge></TableCell>
                    <TableCell className="w-40">
                      <div className="flex items-center gap-2">
                        <Progress value={empresaPct} className="h-2" />
                        <span className="text-xs text-muted-foreground">{empresaPct}%</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={e.status === "concluida" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                    <TableCell className="text-xs">{e.ultima_data ?? "—"}</TableCell>
                    <TableCell className="text-xs">{e.horas_previstas} / restantes {restantes}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <EmpresaForm empresa={e} trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Remover empresa?</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(e.id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
