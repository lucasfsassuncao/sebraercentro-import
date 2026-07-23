import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Building2, CheckCircle2, Clock, Timer, TimerReset } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Gestor Sebrae" },
      { name: "description", content: "Indicadores dos projetos de atendimento." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [{ data: projetos }, { data: empresas }] = await Promise.all([
        supabase.from("projetos").select("*").order("created_at", { ascending: false }),
        supabase.from("empresas").select("*"),
      ]);
      return { projetos: projetos ?? [], empresas: empresas ?? [] };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  const projetos = data?.projetos ?? [];
  const empresas = data?.empresas ?? [];
  const ativos = projetos.filter((p) => p.status === "ativo").length;
  const concluidas = empresas.filter((e) => e.status === "concluida").length;
  const pendentes = empresas.filter((e) => e.status !== "concluida").length;
  const previstas = empresas.reduce((s, e) => s + Number(e.horas_previstas ?? 0), 0);
  const lancadas = empresas.reduce((s, e) => s + Number(e.horas_lancadas ?? 0), 0);

  const cards = [
    { label: "Projetos ativos", value: ativos, icon: FolderKanban, tone: "bg-primary/10 text-primary" },
    { label: "Empresas", value: empresas.length, icon: Building2, tone: "bg-accent/20 text-accent-foreground" },
    { label: "Concluídas", value: concluidas, icon: CheckCircle2, tone: "bg-success/15 text-success" },
    { label: "Pendentes", value: pendentes, icon: Clock, tone: "bg-warning/20 text-warning-foreground" },
    { label: "Horas previstas", value: previstas, icon: Timer, tone: "bg-secondary text-secondary-foreground" },
    { label: "Horas lançadas", value: lancadas, icon: TimerReset, tone: "bg-primary/10 text-primary" },
  ];

  const chartData = projetos.slice(0, 8).map((p) => {
    const es = empresas.filter((e) => e.projeto_id === p.id);
    return {
      nome: p.nome.length > 14 ? p.nome.slice(0, 14) + "…" : p.nome,
      previstas: es.reduce((s, e) => s + Number(e.horas_previstas ?? 0), 0),
      lancadas: es.reduce((s, e) => s + Number(e.horas_lancadas ?? 0), 0),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos seus projetos de atendimento.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className={`mb-3 grid h-9 w-9 place-items-center rounded-lg ${c.tone}`}>
                <c.icon className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Horas por projeto</CardTitle></CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="grid h-64 place-items-center text-sm text-muted-foreground">Nenhum projeto ainda.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="nome" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="previstas" fill="var(--chart-1)" name="Previstas" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="lancadas" fill="var(--chart-2)" name="Lançadas" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Últimos projetos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {projetos.length === 0 && <div className="text-sm text-muted-foreground">Nenhum projeto cadastrado.</div>}
            {projetos.slice(0, 6).map((p) => (
              <Link key={p.id} to="/projetos/$id" params={{ id: p.id }} className="block rounded-lg border p-3 hover:bg-muted/50">
                <div className="font-medium">{p.nome}</div>
                <div className="text-xs text-muted-foreground">{p.municipio ?? "—"} · {p.modelo ?? "—"}</div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
