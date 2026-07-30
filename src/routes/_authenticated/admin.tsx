import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  isCurrentUserAdmin,
  type AdminUser,
  type AppRole,
} from "@/lib/admin-users.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ShieldCheck, Users, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel Admin — Gestor Sebrae" },
      { name: "description", content: "Gerencie usuários, perfis de acesso e permissões do sistema." },
      { property: "og:title", content: "Painel Admin — Gestor Sebrae" },
      { property: "og:description", content: "Gerencie usuários, perfis de acesso e permissões do sistema." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const roleLabel: Record<AppRole, string> = { admin: "Administrador", moderator: "Moderador", user: "Usuário" };

type FormState = { id?: string; nome: string; email: string; password: string; role: AppRole };
const emptyForm: FormState = { nome: "", email: "", password: "", role: "user" };

function AdminPage() {
  const qc = useQueryClient();
  const fetchAdmin = useServerFn(isCurrentUserAdmin);
  const fetchUsers = useServerFn(listUsers);
  const doCreate = useServerFn(createUser);
  const doUpdate = useServerFn(updateUser);
  const doDelete = useServerFn(deleteUser);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [toRemove, setToRemove] = useState<AdminUser | null>(null);

  const me = useQuery({ queryKey: ["is-admin"], queryFn: () => fetchAdmin({}) });
  const isAdmin = me.data?.isAdmin ?? false;

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers({}),
    enabled: isAdmin,
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users.data ?? [];
    return (users.data ?? []).filter(
      (u) => u.nome.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
    );
  }, [q, users.data]);

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      if (f.id) {
        return doUpdate({
          data: { id: f.id, nome: f.nome, email: f.email, role: f.role, ...(f.password ? { password: f.password } : {}) },
        });
      }
      return doCreate({ data: { email: f.email, password: f.password, nome: f.nome, role: f.role } });
    },
    onSuccess: () => {
      toast.success(form.id ? "Usuário atualizado" : "Usuário criado");
      setOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => doDelete({ data: { id } }),
    onSuccess: () => {
      toast.success("Usuário excluído");
      setToRemove(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (me.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Acesso restrito
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Esta área é exclusiva para administradores do sistema.
        </CardContent>
      </Card>
    );
  }

  const total = users.data?.length ?? 0;
  const admins = (users.data ?? []).filter((u) => u.roles.includes("admin")).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel Admin</h1>
          <p className="text-sm text-muted-foreground">Gerencie os usuários e perfis de acesso do sistema.</p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo usuário
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{admins}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>Usuários cadastrados</CardTitle>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Pesquisar por nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">Carregando…</TableCell>
                  </TableRow>
                )}
                {!users.isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">Nenhum usuário encontrado.</TableCell>
                  </TableRow>
                )}
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome || "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {u.roles.length ? (
                        u.roles.map((r) => (
                          <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="mr-1">
                            {roleLabel[r]}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${u.email}`}
                        onClick={() => {
                          setForm({
                            id: u.id,
                            nome: u.nome,
                            email: u.email,
                            password: "",
                            role: (u.roles[0] ?? "user") as AppRole,
                          });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Excluir ${u.email}`}
                        disabled={u.id === me.data?.userId}
                        onClick={() => setToRemove(u)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>{form.id ? "Nova senha (opcional)" : "Senha"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <Label>Perfil de acesso</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="moderator">Moderador</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={save.isPending} onClick={() => save.mutate(form)}>
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. O acesso de {toRemove?.email} será removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toRemove && remove.mutate(toRemove.id)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
