import { supabase } from "@/integrations/supabase/client";
import { onlyDigits } from "@/lib/masks";
import { MAX_ATENDIMENTOS_DIA_CONSULTOR } from "@/lib/horas";

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
  hora?: string | null;         // HH:mm (modelos com horários fixos, ex.: Alvo)
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
      .select("id, hora")
      .eq("cpf_consultor", cpf)
      .eq("data", input.data);

    if (input.ignoreCronogramaId) q = q.neq("id", input.ignoreCronogramaId);

    const { data, error } = await q;
    if (error) throw error;

    const existentes = data ?? [];

    // Sem horário informado: o consultor ocupa o dia inteiro.
    if (!input.hora) {
      const conflito = existentes.length > 0;
      return {
        ok: !conflito,
        mensagem: conflito
          ? "Consultor já possui atendimento registrado nesta data."
          : "Consultor disponível.",
      };
    }

    // Com horário: conflita no mesmo horário ou com atendimentos de dia inteiro.
    const conflitoHorario = existentes.some((r: any) => !r.hora || r.hora === input.hora);
    if (conflitoHorario) {
      return { ok: false, mensagem: "Consultor já possui atendimento registrado nesta data e horário." };
    }

    if (existentes.length >= MAX_ATENDIMENTOS_DIA_CONSULTOR) {
      return {
        ok: false,
        mensagem: `Consultor já atingiu o limite de ${MAX_ATENDIMENTOS_DIA_CONSULTOR} atendimentos nesta data.`,
      };
    }

    return { ok: true, mensagem: "Consultor disponível." };
  },

  /**
   * Valida um lote de linhas em memória (antes de salvar geração inteira),
   * inclui conflitos internos ao próprio lote.
   */
  async validarLote(
    linhas: { cpfConsultor: string; data: string; hora?: string | null; ref?: string }[]
  ): Promise<{ ok: boolean; conflitos: { ref?: string; mensagem: string }[] }> {
    const conflitos: { ref?: string; mensagem: string }[] = [];

    // 1) conflitos dentro do próprio lote
    const seen = new Map<string, string | undefined>();
    const porDia = new Map<string, number>();
    for (const l of linhas) {
      const cpf = onlyDigits(l.cpfConsultor);
      if (!cpf || !l.data) continue;
      const key = l.hora ? `${cpf}|${l.data}|${l.hora}` : `${cpf}|${l.data}`;
      const diaKey = `${cpf}|${l.data}`;
      const qtdDia = (porDia.get(diaKey) ?? 0) + 1;
      porDia.set(diaKey, qtdDia);

      if (seen.has(key) || (!l.hora && qtdDia > 1)) {
        conflitos.push({
          ref: l.ref,
          mensagem: l.hora
            ? "Consultor já possui atendimento neste horário (dentro do lote)."
            : "Consultor já possui atendimento registrado nesta data (dentro do lote).",
        });
      } else {
        seen.set(key, l.ref);
      }

      if (l.hora && qtdDia > MAX_ATENDIMENTOS_DIA_CONSULTOR) {
        conflitos.push({
          ref: l.ref,
          mensagem: `Consultor excede o limite de ${MAX_ATENDIMENTOS_DIA_CONSULTOR} atendimentos no dia (dentro do lote).`,
        });
      }
    }

    // 2) conflitos contra o banco
    for (const l of linhas) {
      if (!onlyDigits(l.cpfConsultor) || !l.data) continue;
      const r = await this.validarConflitoAgenda({ cpfConsultor: l.cpfConsultor, data: l.data, hora: l.hora ?? null });
      if (!r.ok) conflitos.push({ ref: l.ref, mensagem: r.mensagem });
    }

    return { ok: conflitos.length === 0, conflitos };
  },
};
