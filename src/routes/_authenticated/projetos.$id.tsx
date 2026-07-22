import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Pencil, Trash2, Sparkles, CalendarClock } from "lucide-react";
import { EmpresaForm } from "@/components/empresa-form";
import { CronogramaDialog } from "@/components/cronograma-dialog";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { ETAPAS, totalHoras, type Etapa } from "@/lib/horas";
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
  const [openCron, setOpenCron] = useState(false);

  const { data } = useQuery({
    queryKey: ["projeto", id],
    queryFn: async () => {
      const [{ data: p }, { data: es }, { data: gs }] = await Promise.all([
        supabase.from("projetos").select("*").eq("id", id).maybeSingle(),
        supabase.from("empresas").select("*").eq("projeto_id", id).order("razao_social"),
        supabase.from("cronograma_geracoes").select("*").eq("projeto_id", id).order("created_at", { ascending: false }),
      ]);
      return { projeto: p, empresas: es ?? [], geracoes: gs ?? [] };
    },
  });

  const p = data?.projeto;
  const empresas = data?.empresas ?? [];
  const geracoes = data?.geracoes ?? [];

  const empresasComPrevistas = useMemo(() => empresas.map((e: any) => {
    const etapasSel = ETAPAS.filter((t) => (e as any)[`etapa_${t.toLowerCase()}`]) as Etapa[];
    const previstas = totalHoras(p?.modelo, e.porte, etapasSel);
    return { ...e, _previstas: previstas };
  }), [empresas, p?.modelo]);

  async function remove(empresaId: string) {
    const { error } = await supabase.from("empresas").delete().eq("id", empresaId);
    if (error) return toast.error(error.message);
    toast.success("Empresa removida");
    qc.invalidateQueries();
  }

  const totalPrev = empresasComPrevistas.reduce((s, e) => s + e._previstas, 0);
  const totalLanc = empresasComPrevistas.reduce((s, e) => s + Number(e.horas_lancadas ?? 0), 0);
  const totalRest = Math.max(0, totalPrev - totalLanc);
  const concluidas = empresas.filter((e) => e.status === "concluida").length;
  const pendentes = empresas.length - concluidas;
  const pct = empresas.length ? Math.round((concluidas / empresas.length) * 100) : 0;
  const ultimaGer = geracoes[0];

  if (!p) return <div className="text-sm text-muted-foreground">Carregando projeto…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/projetos"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{p.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {p.municipio ?? "—"} · {p.modelo ?? "—"} · Consultor: {p.consultor ?? "—"}
              {p.data_inicial ? ` · Início: ${p.data_inicial}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenCron(true)}>
            <Sparkles className="h-4 w-4" /> Gerar cronograma
          </Button>
          <EmpresaForm projetoId={p.id} trigger={<Button><Plus className="h-4 w-4" /> Nova empresa</Button>} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { l: "Empresas", v: empresas.length },
          { l: "Concluídas", v: concluidas },
          { l: "Pendentes", v: pendentes },
          { l: "Gerações", v: geracoes.length },
          { l: "Horas previstas", v: `${totalPrev}h` },
          { l: "Horas lançadas", v: `${totalLanc}h` },
          { l: "Horas restantes", v: `${totalRest}h` },
          { l: "Última geração", v: ultimaGer ? new Date(ultimaGer.created_at).toLocaleDateString() : "—" },
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
                <TableHead>Porte</TableHead>
                <TableHead>Etapas</TableHead>
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
              {empresasComPrevistas.map((e) => {
                const etapasSel = ETAPAS.filter((t) => (e as any)[`etapa_${t.toLowerCase()}`]);
                const empresaPct = e._previstas ? Math.min(100, Math.round((Number(e.horas_lancadas ?? 0) / e._previstas) * 100)) : 0;
                const restantes = Math.max(0, e._previstas - Number(e.horas_lancadas ?? 0));
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.razao_social}</TableCell>
                    <TableCell className="text-xs">{e.cnpj || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{e.porte}</Badge></TableCell>
                    <TableCell className="text-xs">{etapasSel.join(", ") || "—"}</TableCell>
                    <TableCell className="w-40">
                      <div className="flex items-center gap-2">
                        <Progress value={empresaPct} className="h-2" />
                        <span className="text-xs text-muted-foreground">{empresaPct}%</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={e.status === "concluida" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                    <TableCell className="text-xs">{e.ultima_data ?? "—"}</TableCell>
                    <TableCell className="text-xs">{e._previstas}h · rest. {restantes}h</TableCell>
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

      {geracoes.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="h-4 w-4" /> Gerações recentes
            </div>
            <div className="space-y-2 text-sm">
              {geracoes.slice(0, 5).map((g) => (
                <Link key={g.id} to="/cronogramas/$geracaoId" params={{ geracaoId: g.id }}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50">
                  <div>
                    <div className="font-medium">{new Date(g.created_at).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{g.usuario ?? "—"}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {g.total_empresas} empresa(s) · {g.total_atendimentos} atend. · {g.total_horas}h
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <CronogramaDialog open={openCron} onOpenChange={setOpenCron} projeto={p} empresas={empresas} />
    </div>
  );
}
