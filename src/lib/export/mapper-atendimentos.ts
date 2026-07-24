import type { ConsultoriaExportDTO } from "./dto";
import { onlyDigits } from "@/lib/masks";

/**
 * NOVO MAPPER para Atendimentos (NEW MODEL)
 * 
 * Diferença crítica:
 * - ANTES: CPF vinha de `cronograma.cpf_consultor` ou `projeto.cpf_consultor`
 * - AGORA:  CPF vem de `atendimento.consultor.cpf` (relação direta com o consultor)
 * 
 * Layout Sebrae mantém compatibilidade, apenas a FONTE do CPF mudou.
 */
export interface MapperInputAtendimento {
  atendimento: {
    id: string;
    data: string;
    horas: number;
    descricao?: string | null;
    categoria?: string | null;
    tema?: string | null;
    meio_atendimento?: string | null;
    cidade?: string | null;
  };
  consultor: {
    id: string;
    nome: string;
    cpf: string | null;
  } | null;
  empresa: {
    razao_social: string;
    cnpj: string | null;
  } | null;
  projeto: {
    codigo_disponibilizacao?: string | null;
    codigo_ibge?: string | null;
    codigo_categoria?: string | null;
    codigo_meio_atendimento?: string | null;
    codigo_tema?: string | null;
  } | null;
}

/**
 * LEGACY MAPPER para Cronogramas (OLD MODEL)
 * Mantido para compatibilidade com dados antigos
 */
export interface MapperInput {
  linha: {
    data: string;
    horas: number | string;
    descricao?: string | null;
    codigo_disponibilizacao?: string | null;
    codigo_ibge?: string | null;
    codigo_categoria?: string | null;
    codigo_meio_atendimento?: string | null;
    codigo_tema?: string | null;
    cpf_consultor?: string | null;
  };
  projeto: {
    codigo_disponibilizacao?: string | null;
    codigo_ibge?: string | null;
    codigo_categoria?: string | null;
    codigo_meio_atendimento?: string | null;
    codigo_tema?: string | null;
    cpf_consultor?: string | null;
  } | null;
  empresa: {
    cnpj?: string | null;
    cpf_cliente?: string | null;
  } | null;
}

function pick(...vals: (string | null | undefined)[]): string {
  for (const v of vals)
    if (v != null && String(v).trim() !== "") return String(v).trim();
  return "";
}

/**
 * AtendimentoExportMapper — NOVO
 * Mapeia atendimento (NEW MODEL) para DTO de exportação Sebrae
 *
 * KEY CHANGE: cpfConsultor vem de atendimento.consultor.cpf
 */
export const AtendimentoExportMapper = {
  toDTO({
    atendimento,
    consultor,
    empresa,
    projeto,
  }: MapperInputAtendimento): ConsultoriaExportDTO {
    return {
      codDisponibilizacao: pick(
        projeto?.codigo_disponibilizacao as any
      ),
      documentoCliente: onlyDigits(pick(empresa?.cnpj)), // Nota: era cpf_cliente, agora é cnpj (empresa)
      documentoEmpresa: onlyDigits(pick(empresa?.cnpj)),
      data: pick(atendimento.data),
      cpfConsultor: onlyDigits(pick(consultor?.cpf)), // ← CRITICAL: CPF from atendimento.consultor.cpf
      horas: Number(atendimento.horas) || 0,
      descricao: pick(atendimento.descricao),
      codCidade: pick(atendimento.cidade, projeto?.codigo_ibge as any),
      codCategoria: pick(atendimento.categoria, projeto?.codigo_categoria as any),
      codMeioAtendimento: pick(
        atendimento.meio_atendimento,
        projeto?.codigo_meio_atendimento as any
      ),
      codTema: pick(atendimento.tema, projeto?.codigo_tema as any),
    };
  },

  toDTOList(inputs: MapperInputAtendimento[]): ConsultoriaExportDTO[] {
    return inputs.map((i) => this.toDTO(i));
  },
};

/**
 * ConsultoriaExportMapper — LEGACY (cronogramas)
 * Mantido para compatibilidade com dados antigos
 */
export const ConsultoriaExportMapper = {
  toDTO({ linha, projeto, empresa }: MapperInput): ConsultoriaExportDTO {
    return {
      codDisponibilizacao: pick(
        linha.codigo_disponibilizacao,
        projeto?.codigo_disponibilizacao
      ),
      documentoCliente: onlyDigits(pick(empresa?.cpf_cliente)),
      documentoEmpresa: onlyDigits(pick(empresa?.cnpj)),
      data: pick(linha.data),
      cpfConsultor: onlyDigits(
        pick(linha.cpf_consultor, projeto?.cpf_consultor)
      ),
      horas: Number(linha.horas) || 0,
      descricao: pick(linha.descricao),
      codCidade: pick(linha.codigo_ibge, projeto?.codigo_ibge),
      codCategoria: pick(
        linha.codigo_categoria,
        projeto?.codigo_categoria
      ),
      codMeioAtendimento: pick(
        linha.codigo_meio_atendimento,
        projeto?.codigo_meio_atendimento
      ),
      codTema: pick(linha.codigo_tema, projeto?.codigo_tema),
    };
  },

  toDTOList(inputs: MapperInput[]): ConsultoriaExportDTO[] {
    return inputs.map((i) => this.toDTO(i));
  },
};
