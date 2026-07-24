import type { ConsultoriaExportDTO } from "./dto";
import { onlyDigits } from "@/lib/masks";

/**
 * Fontes de dados usadas pelo mapper. Aceita qualquer forma "linha do cronograma"
 * enriquecida com o Projeto e a Empresa correspondentes.
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
  for (const v of vals) if (v != null && String(v).trim() !== "") return String(v).trim();
  return "";
}

/**
 * ConsultoriaExportMapper — converte uma linha de cronograma (+ projeto + empresa)
 * no DTO oficial de exportação, aplicando as regras do layout Sebrae.
 */
export const ConsultoriaExportMapper = {
  toDTO({ linha, projeto, empresa }: MapperInput): ConsultoriaExportDTO {
    return {
      codDisponibilizacao: pick(linha.codigo_disponibilizacao, projeto?.codigo_disponibilizacao),
      documentoCliente:    onlyDigits(pick(empresa?.cpf_cliente)),
      documentoEmpresa:    onlyDigits(pick(empresa?.cnpj)),
      data:                pick(linha.data),
      cpfConsultor:        onlyDigits(pick(linha.cpf_consultor, projeto?.cpf_consultor)),
      horas:               Number(linha.horas) || 0,
      descricao:           pick(linha.descricao),
      codCidade:           pick(linha.codigo_ibge, projeto?.codigo_ibge),
      codCategoria:        pick(linha.codigo_categoria, projeto?.codigo_categoria),
      codMeioAtendimento:  pick(linha.codigo_meio_atendimento, projeto?.codigo_meio_atendimento),
      codTema:             pick(linha.codigo_tema, projeto?.codigo_tema),
    };
  },

  toDTOList(inputs: MapperInput[]): ConsultoriaExportDTO[] {
    return inputs.map((i) => this.toDTO(i));
  },
};
