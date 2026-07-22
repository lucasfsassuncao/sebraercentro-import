import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BarChart3, Building2, ClipboardList, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestor de Projetos Sebrae" },
      { name: "description", content: "Gerencie projetos de atendimento, empresas participantes e horas de consultoria em uma plataforma moderna." },
      { property: "og:title", content: "Gestor de Projetos Sebrae" },
      { property: "og:description", content: "Gerencie projetos de atendimento, empresas participantes e horas de consultoria em uma plataforma moderna." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ClipboardList className="h-5 w-5" />
            </div>
            Gestor Sebrae
          </div>
          <Link to="/auth">
            <Button>Entrar</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <section className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-foreground">
              Projetos de Atendimento
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Gerencie seus projetos de consultoria Sebrae com clareza
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Cadastre projetos, empresas participantes e controle horas previstas e lançadas — tudo pronto para futuras exportações.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg">Começar agora</Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: BarChart3, title: "Dashboard", desc: "Indicadores em tempo real" },
              { icon: Building2, title: "Empresas", desc: "Cadastro completo por projeto" },
              { icon: ClipboardList, title: "Projetos", desc: "Controle de etapas e horas" },
              { icon: ShieldCheck, title: "Seguro", desc: "Dados isolados por usuário" },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="mt-3 font-semibold">{f.title}</div>
                <div className="text-sm text-muted-foreground">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
