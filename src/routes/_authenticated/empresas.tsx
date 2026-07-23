import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { EmpresaForm } from "@/components/empresa-form";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/empresas")({
  head: () => ({ meta: [{ title: "Empresas — Gestor Sebrae" }, { name: "description", content: "Todas as empresas participantes." }] }),
  component: EmpresasList,
});

const PAGE_SIZE = 15;

function EmpresasList() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [projetoFilter, setProjetoFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data } = useQuery({
    queryKey: ["empresas-all"],
    queryFn: async () => {
      const [{ data: es }, { data: ps }] = await Promise.all([
        supabase.from("empresas").select("*").order("razao_social"),
        supabase.from("projetos").select("id,nome,municipio,modelo"),
      ]);
      return { empresas: es ?? [], projetos: ps ?? [] };
    },
  });

  const empresas = data?.empresas ?? [];
  const projetos = data?.projetos ?? [];
  const projetoById = useMemo(
    () => Object.fromEntries(projetos.map((p) => [p.id, p])) as Record<string, typeof projetos[number]>,
    [projetos],
  );
  const projetoNome = (id: string) => projetoById[id]?.nome ?? "—";

  const filtered = useMemo(() => {
    return empresas.filter((e) => {
      if (projetoFilter !== "all" && e.projeto_id !== projetoFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (q) {
        const s = q.toLowerCase();
        const p = projetoById[e.projeto_id];
        return [e.razao_social, e.cnpj, p?.municipio, p?.modelo, p?.nome]
          .filter(Boolean).some((v) => v!.toLowerCase().includes(s));
      }
      return true;
    });
  }, [empresas, q, projetoFilter, statusFilter, projetoById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function remove(id: string) {
    const { error } = await supabase.from("empresas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removida");
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
          <p className="text-sm text-muted-foreground">Empresas participantes de todos os seus projetos.</p>
        </div>
        <EmpresaForm trigger={<Button><Plus className="h-4 w-4" /> Nova empresa</Button>} />
      </div>

      <Card><CardContent className="flex flex-wrap gap-3 p-4">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, CNPJ, município…" className="pl-9" />
        </div>
        <Select value={projetoFilter} onValueChange={setProjetoFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Projeto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
          </SelectContent>
        </Select>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Nenhuma empresa.</TableCell></TableRow>}
            {paged.map((e) => {
              const etapas = [e.etapa_t0, e.etapa_t1, e.etapa_t2, e.etapa_t3, e.etapa_t4].filter(Boolean).length;
              const pct = Math.round((etapas / 5) * 100);
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.razao_social}</TableCell>
                  <TableCell className="text-xs">{projetoNome(e.projeto_id)}</TableCell>
                  <TableCell className="text-xs">{e.cnpj || "—"}</TableCell>
                  <TableCell className="text-xs">{projetoById[e.projeto_id]?.municipio || "—"}</TableCell>
                  <TableCell className="text-xs">{projetoById[e.projeto_id]?.modelo || "—"}</TableCell>
                  <TableCell className="w-40"><div className="flex items-center gap-2"><Progress value={pct} className="h-2" /><span className="text-xs">{pct}%</span></div></TableCell>
                  <TableCell><Badge variant={e.status === "concluida" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
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
      </CardContent></Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
        </div>
      )}
    </div>
  );
}
