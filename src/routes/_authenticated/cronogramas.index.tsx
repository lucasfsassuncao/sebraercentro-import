import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarClock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cronogramas/")({
  head: () => ({ meta: [{ title: "Cronogramas — Gestor Sebrae" }, { name: "description", content: "Cronogramas de atendimento gerados." }] }),
  component: CronogramasList,
});

function CronogramasList() {
  const { data } = useQuery({
    queryKey: ["cronograma-geracoes"],
    queryFn: async () => {
      const [{ data: gs }, { data: ps }] = await Promise.all([
        supabase.from("cronograma_geracoes").select("*").order("created_at", { ascending: false }),
        supabase.from("projetos").select("id,nome"),
      ]);
      return { geracoes: gs ?? [], projetos: ps ?? [] };
    },
  });

  const geracoes = data?.geracoes ?? [];
  const nome = (id: string) => data?.projetos.find((p) => p.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cronogramas</h1>
        <p className="text-sm text-muted-foreground">Histórico de cronogramas gerados.</p>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Empresas</TableHead>
              <TableHead>Atendimentos</TableHead>
              <TableHead>Total de horas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {geracoes.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-16 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted"><CalendarClock className="h-6 w-6 text-muted-foreground" /></div>
                <div className="mt-3 font-medium">Nenhum cronograma gerado</div>
                <div className="text-sm text-muted-foreground">Gere um cronograma a partir da tela do projeto.</div>
              </TableCell></TableRow>
            )}
            {geracoes.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="text-xs">
                  <Link to="/cronogramas/$geracaoId" params={{ geracaoId: g.id }} className="hover:underline">
                    {new Date(g.created_at).toLocaleString()}
                  </Link>
                </TableCell>
                <TableCell>{nome(g.projeto_id)}</TableCell>
                <TableCell className="text-xs">{g.usuario ?? "—"}</TableCell>
                <TableCell>{g.total_empresas}</TableCell>
                <TableCell>{g.total_atendimentos}</TableCell>
                <TableCell>{g.total_horas}h</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
