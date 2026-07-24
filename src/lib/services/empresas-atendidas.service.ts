import { supabase } from "@/integrations/supabase/client";

export interface EmpresaAtendida {
  id: string;
  user_id: string;
  projeto_id: string;
  razao_social: string;
  cnpj?: string | null;
  cidade: string;
  created_at: string;
  updated_at: string;
}

export interface CriarEmpresaAtendidaDTO {
  projeto_id: string;
  razao_social: string;
  cnpj?: string | null;
  cidade: string;
}

/**
 * EmpresaAtendidaService — Complete CRUD for empresas_atendidas
 *
 * ARCHITECTURE:
 * Represents client/company served within a project.
 * Links: Projeto (1:N) -> Empresa Atendida (1:N) -> Atendimento
 */
export const EmpresaAtendidaService = {
  /**
   * List all empresas_atendidas for a project
   */
  async listar(projetoId: string): Promise<EmpresaAtendida[]> {
    const { data, error } = await supabase
      .from("empresas_atendidas")
      .select("*")
      .eq("projeto_id", projetoId)
      .order("razao_social");

    if (error) throw error;
    return (data as EmpresaAtendida[]) || [];
  },

  /**
   * Get single empresa_atendida by ID
   */
  async buscarPorId(id: string): Promise<EmpresaAtendida | null> {
    const { data, error } = await supabase
      .from("empresas_atendidas")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return (data as EmpresaAtendida) || null;
  },

  /**
   * Create new empresa_atendida
   */
  async criar(dto: CriarEmpresaAtendidaDTO): Promise<EmpresaAtendida> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("empresas_atendidas")
      .insert([
        {
          ...dto,
          user_id: userData.user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return (data as EmpresaAtendida);
  },

  /**
   * Update empresa_atendida
   */
  async atualizar(
    id: string,
    updates: Partial<CriarEmpresaAtendidaDTO>
  ): Promise<EmpresaAtendida> {
    const { data, error } = await supabase
      .from("empresas_atendidas")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return (data as EmpresaAtendida);
  },

  /**
   * Delete empresa_atendida
   * WARNING: This will cascade delete all atendimentos for this company
   */
  async deletar(id: string): Promise<void> {
    const { error } = await supabase
      .from("empresas_atendidas")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Get all empresas_atendidas for user
   */
  async listarPorUsuario(): Promise<EmpresaAtendida[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("empresas_atendidas")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("razao_social");

    if (error) throw error;
    return (data as EmpresaAtendida[]) || [];
  },
};
