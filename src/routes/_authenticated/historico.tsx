import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico — Gestor Sebrae" }, { name: "description", content: "Histórico de atendimentos e exportações." }] }),
  component: Historico,
});

function Historico() {
  const { data } = useQuery({
    queryKey: ["historico"],
    queryFn: async () => (await supabase.from("historico").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Histórico</h1>
        <p className="text-sm text-muted-foreground">Registro de atendimentos e futuras exportações.</p>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Observações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-16 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted"><History className="h-6 w-6 text-muted-foreground" /></div>
                <div className="mt-3 font-medium">Sem registros no histórico</div>
                <div className="text-sm text-muted-foreground">Ações e exportações aparecerão aqui.</div>
              </TableCell></TableRow>
            )}
            {rows.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="text-xs">{h.data}</TableCell>
                <TableCell>{h.projeto_nome ?? "—"}</TableCell>
                <TableCell>{h.empresa_nome ?? "—"}</TableCell>
                <TableCell className="text-xs">{h.usuario ?? "—"}</TableCell>
                <TableCell>{h.status ? <Badge variant="secondary">{h.status}</Badge> : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{h.observacoes ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
