import { supabase } from "@/integrations/supabase/client";

export interface Atendimento {
  id: string;
  user_id: string;
  projeto_id: string;
  empresa_id: string;
  consultor_id: string;
  data: string;
  horas: number;
  descricao?: string | null;
  categoria?: string | null;
  meio_atendimento?: string | null;
  tema?: string | null;
  cidade: string;
  created_at: string;
  updated_at: string;
  consultor?: { id: string; nome: string; cpf: string | null };
  empresa?: { razao_social: string; cnpj: string | null };
}

export interface CriarAtendimentoDTO {
  projeto_id: string;
  empresa_id: string;
  consultor_id: string;
  data: string;
  horas: number;
  descricao?: string | null;
  categoria?: string | null;
  meio_atendimento?: string | null;
  tema?: string | null;
  cidade: string;
}

export interface ValidacaoConflito {
  disponivel: boolean;
  mensagem: string;
}

/**
 * AtendimentoService — Complete CRUD for atendimentos (consultoria sessions)
 * with schedule conflict validation
 *
 * ARCHITECTURE:
 * Projeto (1:N) -> Empresa Atendida (1:N) -> Atendimento (N:1) -> Consultor
 *
 * KEY VALIDATION:
 * - A consultant cannot have 2 appointments on the same date
 * - Validation happens both client-side and server-side (trigger)
 */
export const AtendimentoService = {
  /**
   * List all atendimentos, optionally filtered by projeto
   */
  async listar(projetoId?: string): Promise<Atendimento[]> {
    let query = supabase
      .from("atendimentos")
      .select(
        `
        *,
        consultor:consultores(id, nome, cpf),
        empresa:empresas_atendidas(razao_social, cnpj)
      `
      );

    if (projetoId) {
      query = query.eq("projeto_id", projetoId);
    }

    const { data, error } = await query.order("data", { ascending: false });

    if (error) throw error;
    return (data as any[]) || [];
  },

  /**
   * Get single atendimento by ID
   */
  async buscarPorId(id: string): Promise<Atendimento | null> {
    const { data, error } = await supabase
      .from("atendimentos")
      .select(
        `
        *,
        consultor:consultores(id, nome, cpf),
        empresa:empresas_atendidas(razao_social, cnpj)
      `
      )
      .eq("id", id)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return (data as any) || null;
  },

  /**
   * CRITICAL: Validate schedule conflict BEFORE attempting to save
   * Consultant cannot have 2 appointments on same date
   *
   * @param consultorId UUID of consultant
   * @param data ISO date string (YYYY-MM-DD)
   * @param atendimentoIdExcluir Optional ID to exclude (when updating)
   * @returns ValidationResult with availability status and message
   */
  async validarConflitosAgenda(
    consultorId: string,
    data: string,
    atendimentoIdExcluir?: string
  ): Promise<ValidacaoConflito> {
    try {
      // Query existing appointments for this consultant on this date
      let query = supabase
        .from("atendimentos")
        .select("id", { count: "exact", head: true })
        .eq("consultor_id", consultorId)
        .eq("data", data);

      // When updating, exclude the current appointment
      if (atendimentoIdExcluir) {
        query = query.neq("id", atendimentoIdExcluir);
      }

      const { count, error } = await query;

      if (error) throw error;

      const temConflito = (count ?? 0) > 0;

      return {
        disponivel: !temConflito,
        mensagem: temConflito
          ? `Consultor já possui atendimento registrado em ${new Date(data).toLocaleDateString("pt-BR")}.`
          : "Consultor disponível para esta data.",
      };
    } catch (err) {
      console.error("Erro ao validar agenda:", err);
      throw err;
    }
  },

  /**
   * Check consultant availability for a date range
   * Useful for calendar views
   */
  async verificarDisponibilidadeConsultor(
    consultorId: string,
    dataInicio: string,
    dataFim: string
  ): Promise<{ data: string; disponivel: boolean }[]> {
    const { data, error } = await supabase
      .from("atendimentos")
      .select("data")
      .eq("consultor_id", consultorId)
      .gte("data", dataInicio)
      .lte("data", dataFim)
      .order("data");

    if (error) throw error;

    // Generate list of all dates in range with availability
    const ocupadas = new Set((data as any[]).map((d) => d.data));
    const resultado: { data: string; disponivel: boolean }[] = [];

    const atual = new Date(dataInicio);
    const fim = new Date(dataFim);

    while (atual <= fim) {
      const dataStr = atual.toISOString().split("T")[0];
      resultado.push({
        data: dataStr,
        disponivel: !ocupadas.has(dataStr),
      });
      atual.setDate(atual.getDate() + 1);
    }

    return resultado;
  },

  /**
   * Create new atendimento with schedule conflict validation
   * FLOW:
   * 1. Validate schedule conflict
   * 2. If available, save to DB
   * 3. Server-side trigger also validates (belt-and-suspenders)
   */
  async criar(dto: CriarAtendimentoDTO): Promise<Atendimento> {
    // Step 1: Client-side validation
    const validacao = await this.validarConflitosAgenda(
      dto.consultor_id,
      dto.data
    );

    if (!validacao.disponivel) {
      throw new Error(validacao.mensagem);
    }

    // Step 2: Get current user
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Usuário não autenticado");

    // Step 3: Insert with user_id
    const { data, error } = await supabase
      .from("atendimentos")
      .insert([
        {
          ...dto,
          user_id: userData.user.id,
        },
      ])
      .select(
        `
        *,
        consultor:consultores(id, nome, cpf),
        empresa:empresas_atendidas(razao_social, cnpj)
      `
      )
      .single();

    if (error) {
      // Check if error is due to schedule conflict (from trigger)
      if (error.message.includes("atendimento registrado nesta data")) {
        throw new Error(
          "Consultor já possui atendimento registrado nesta data."
        );
      }
      throw error;
    }

    return (data as any) as Atendimento;
  },

  /**
   * Update existing atendimento
   * If consultor_id or data changed, re-validate schedule conflicts
   */
  async atualizar(
    id: string,
    updates: Partial<CriarAtendimentoDTO>
  ): Promise<Atendimento> {
    // Get current atendimento to compare
    const atual = await this.buscarPorId(id);
    if (!atual) throw new Error("Atendimento não encontrado");

    // If consultant or date changed, validate new schedule
    if (updates.consultor_id || updates.data) {
      const consultorId = updates.consultor_id || atual.consultor_id;
      const data = updates.data || atual.data;

      const validacao = await this.validarConflitosAgenda(
        consultorId,
        data,
        id
      );
      if (!validacao.disponivel) {
        throw new Error(validacao.mensagem);
      }
    }

    // Perform update
    const { data, error } = await supabase
      .from("atendimentos")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        *,
        consultor:consultores(id, nome, cpf),
        empresa:empresas_atendidas(razao_social, cnpj)
      `
      )
      .single();

    if (error) throw error;
    return (data as any) as Atendimento;
  },

  /**
   * Delete atendimento
   */
  async deletar(id: string): Promise<void> {
    const { error } = await supabase
      .from("atendimentos")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Get atendimentos for a specific consultant in a date range
   * Useful for consultant schedule view
   */
  async listarPorConsultor(
    consultorId: string,
    dataInicio?: string,
    dataFim?: string
  ): Promise<Atendimento[]> {
    let query = supabase
      .from("atendimentos")
      .select(
        `
        *,
        consultor:consultores(id, nome, cpf),
        empresa:empresas_atendidas(razao_social, cnpj)
      `
      )
      .eq("consultor_id", consultorId);

    if (dataInicio) {
      query = query.gte("data", dataInicio);
    }
    if (dataFim) {
      query = query.lte("data", dataFim);
    }

    const { data, error } = await query.order("data", { ascending: true });

    if (error) throw error;
    return (data as any[]) || [];
  },

  /**
   * Get atendimentos for a specific company
   */
  async listarPorEmpresa(empresaId: string): Promise<Atendimento[]> {
    const { data, error } = await supabase
      .from("atendimentos")
      .select(
        `
        *,
        consultor:consultores(id, nome, cpf),
        empresa:empresas_atendidas(razao_social, cnpj)
      `
      )
      .eq("empresa_id", empresaId)
      .order("data", { ascending: false });

    if (error) throw error;
    return (data as any[]) || [];
  },

  /**
   * Get atendimentos for a specific project
   */
  async listarPorProjeto(projetoId: string): Promise<Atendimento[]> {
    const { data, error } = await supabase
      .from("atendimentos")
      .select(
        `
        *,
        consultor:consultores(id, nome, cpf),
        empresa:empresas_atendidas(razao_social, cnpj)
      `
      )
      .eq("projeto_id", projetoId)
      .order("data", { ascending: false });

    if (error) throw error;
    return (data as any[]) || [];
  },
};
