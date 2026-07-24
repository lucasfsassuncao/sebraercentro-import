import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { maskCPF } from "@/lib/masks";
import { AtendimentoService } from "@/lib/services/atendimentos.service";
import { FormularioAtendimento } from "@/components/formulario-atendimento";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/atendimentos/$id")({  head: () => ({
    meta: [
      { title: "Detalhes do Atendimento — Gestor Sebrae" },
      { name: "description", content: "Visualizar e editar atendimento." },
    ],
  }),
  component: AtendimentoDetail,
});

function AtendimentoDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: atendimento, isLoading } = useQuery({
    queryKey: ["atendimento-detail", id],
    queryFn: () => AtendimentoService.buscarPorId(id),
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!atendimento) {
    return (
      <div className="space-y-4">
        <Link to="/atendimentos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="text-sm text-muted-foreground">
          Atendimento não encontrado.
        </div>
      </div>
    );
  }

  const data = new Date(atendimento.data);
  const dataFormatada = data.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  async function remover() {
    try {
      await AtendimentoService.deletar(atendimento.id);
      toast.success("Atendimento removido");
      qc.invalidateQueries();
      setTimeout(() => {
        window.location.href = "/atendimentos";
      }, 100);
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/atendimentos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {(atendimento.empresa as any)?.razao_social}
            </h1>
            <p className="text-sm text-muted-foreground">
              {dataFormatada}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <FormularioAtendimento
            atendimento={atendimento}
            trigger=<Button><Edit className="h-4 w-4" /> Editar</Button>
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4" /> Remover
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover atendimento?</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={remover}>Remover</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="detalhes" className="w-full">
        <TabsList>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="infos">Informações</TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações Principais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Empresa Atendida
                </p>
                <p className="text-lg font-semibold">
                  {(atendimento.empresa as any)?.razao_social}
                </p>
                {(atendimento.empresa as any)?.cnpj && (
                  <p className="text-sm text-muted-foreground">
                    CNPJ: {(atendimento.empresa as any).cnpj}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Consultor
                </p>
                <p className="text-lg font-semibold">
                  {(atendimento.consultor as any)?.nome}
                </p>
                {(atendimento.consultor as any)?.cpf && (
                  <p className="text-sm text-muted-foreground">
                    CPF: {maskCPF((atendimento.consultor as any).cpf)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Data
                </p>
                <p className="text-lg font-semibold">{dataFormatada}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Horas
                </p>
                <p className="text-lg font-semibold">{atendimento.horas}h</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Cidade
                </p>
                <p className="text-lg font-semibold">{atendimento.cidade}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Categoria
                </p>
                <Badge variant="outline">
                  {atendimento.categoria || "—"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {atendimento.descricao && (
            <Card>
              <CardHeader>
                <CardTitle>Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
                  {atendimento.descricao}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="infos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Tema
                </p>
                <p className="text-lg">{atendimento.tema || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Meio de Atendimento
                </p>
                <p className="text-lg">
                  {atendimento.meio_atendimento || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Criado em
                </p>
                <p className="text-sm">
                  {new Date(atendimento.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Última Atualização
                </p>
                <p className="text-sm">
                  {new Date(atendimento.updated_at).toLocaleString("pt-BR")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
