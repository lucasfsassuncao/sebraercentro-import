import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "admin" | "moderator" | "user";

export type AdminUser = {
  id: string;
  email: string;
  nome: string;
  roles: AppRole[];
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
};

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado: apenas administradores.");
}

export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: Boolean(data), userId: context.userId as string };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);

    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, nome, email");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");

    const users: AdminUser[] = list.users.map((u) => {
      const p = profiles?.find((x) => x.id === u.id);
      return {
        id: u.id,
        email: u.email ?? p?.email ?? "",
        nome: p?.nome ?? (u.user_metadata?.nome as string) ?? "",
        roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as AppRole),
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        banned: Boolean((u as any).banned_until && new Date((u as any).banned_until) > new Date()),
      };
    });

    users.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return users;
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; password: string; nome: string; role: AppRole }) => {
    if (!input.email?.includes("@")) throw new Error("E-mail inválido.");
    if (!input.password || input.password.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error) throw new Error(error.message);

    const id = created.user!.id;
    await supabaseAdmin.from("profiles").upsert({ id, email: data.email, nome: data.nome });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    await supabaseAdmin.from("user_roles").insert({ user_id: id, role: data.role });
    return { id };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; nome?: string; email?: string; password?: string; role?: AppRole }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const attrs: Record<string, unknown> = {};
    if (data.email) attrs.email = data.email;
    if (data.password) {
      if (data.password.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres.");
      attrs.password = data.password;
    }
    if (data.nome !== undefined) attrs.user_metadata = { nome: data.nome };
    if (Object.keys(attrs).length) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, attrs as any);
      if (error) throw new Error(error.message);
    }

    if (data.nome !== undefined || data.email) {
      await supabaseAdmin
        .from("profiles")
        .upsert({ id: data.id, ...(data.nome !== undefined ? { nome: data.nome } : {}), ...(data.email ? { email: data.email } : {}) });
    }

    if (data.role) {
      if (data.id === context.userId && data.role !== "admin") {
        throw new Error("Você não pode remover seu próprio acesso de administrador.");
      }
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
      await supabaseAdmin.from("user_roles").insert({ user_id: data.id, role: data.role });
    }

    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("Você não pode excluir seu próprio usuário.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
