import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Gestor Sebrae" },
      { name: "description", content: "Acesse sua conta para gerenciar projetos e empresas." },
      { property: "og:title", content: "Entrar — Gestor Sebrae" },
      { property: "og:description", content: "Acesse sua conta para gerenciar projetos e empresas." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    navigate({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome: String(fd.get("nome") ?? "") },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Você já pode entrar.");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-primary via-primary/70 to-accent/40 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Gestor Sebrae</div>
            <div className="text-xs text-muted-foreground">Projetos de Atendimento</div>
          </div>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-4 pt-4">
              <div><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required /></div>
              <div><Label htmlFor="password">Senha</Label><Input id="password" name="password" type="password" required /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-4 pt-4">
              <div><Label htmlFor="nome">Nome</Label><Input id="nome" name="nome" required /></div>
              <div><Label htmlFor="email2">E-mail</Label><Input id="email2" name="email" type="email" required /></div>
              <div><Label htmlFor="password2">Senha</Label><Input id="password2" name="password" type="password" required minLength={6} /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Criando…" : "Criar conta"}</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
