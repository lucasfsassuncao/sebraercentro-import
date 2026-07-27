import { supabase } from "@/integrations/supabase/client";
import { onlyDigits } from "@/lib/masks";

/**
 * AtendimentoValidacaoService
 * -----------------------------------------------------------------
 * Centraliza a regra de conflito de agenda do Consultor.
 *
 * Regra atual (somente data): um Consultor NÃO pode possuir dois
 * atendimentos (linhas de `cronogramas`) na mesma data.
 *
 * Preparado para evoluir para horário inicial/final: basta acrescentar
 * `horaInicio` / `horaFim` ao input e ao filtro SQL (range overlap).
 */
export interface ConflitoAgendaInput {
  cpfConsultor: string;
  data: string;                 // yyyy-mm-dd
  ignoreCronogramaId?: string;  // ao editar uma linha existente
}

export interface ResultadoValidacao {
  ok: boolean;
  mensagem: string;
}

export const AtendimentoValidacaoService = {
  async validarConflitoAgenda(input: ConflitoAgendaInput): Promise<ResultadoValidacao> {
    const cpf = onlyDigits(input.cpfConsultor || "");
    if (!cpf || !input.data) {
      return { ok: true, mensagem: "Sem dados suficientes para validar." };
    }

    let q = supabase
      .from("cronogramas")
      .select("id", { count: "exact", head: true })
      .eq("cpf_consultor", cpf)
      .eq("data", input.data);

    if (input.ignoreCronogramaId) q = q.neq("id", input.ignoreCronogramaId);

    const { count, error } = await q;
    if (error) throw error;

    const conflito = (count ?? 0) > 0;
    return {
      ok: !conflito,
      mensagem: conflito
        ? "Consultor já possui atendimento registrado nesta data."
        : "Consultor disponível.",
    };
  },

  /**
   * Valida um lote de linhas em memória (antes de salvar geração inteira),
   * inclui conflitos internos ao próprio lote.
   */
  async validarLote(
    linhas: { cpfConsultor: string; data: string; ref?: string }[]
  ): Promise<{ ok: boolean; conflitos: { ref?: string; mensagem: string }[] }> {
    const conflitos: { ref?: string; mensagem: string }[] = [];

    // 1) conflitos dentro do próprio lote
    const seen = new Map<string, string | undefined>();
    for (const l of linhas) {
      const key = `${onlyDigits(l.cpfConsultor)}|${l.data}`;
      if (!onlyDigits(l.cpfConsultor) || !l.data) continue;
      if (seen.has(key)) {
        conflitos.push({
          ref: l.ref,
          mensagem: "Consultor já possui atendimento registrado nesta data (dentro do lote).",
        });
      } else {
        seen.set(key, l.ref);
      }
    }

    // 2) conflitos contra o banco
    for (const l of linhas) {
      if (!onlyDigits(l.cpfConsultor) || !l.data) continue;
      const r = await this.validarConflitoAgenda({ cpfConsultor: l.cpfConsultor, data: l.data });
      if (!r.ok) conflitos.push({ ref: l.ref, mensagem: r.mensagem });
    }

    return { ok: conflitos.length === 0, conflitos };
  },
};
