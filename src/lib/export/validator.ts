import type { ConsultoriaExportDTO } from "./dto";

export interface ExportValidationError {
  linha: number; // 1-based, referente à ordem das consultorias
  campo: string;
  mensagem: string;
}

export interface ExportValidationResult {
  valido: boolean;
  erros: ExportValidationError[];
}

const REQUIRED: (keyof ConsultoriaExportDTO)[] = [
  "codDisponibilizacao",
  "documentoCliente",
  "documentoEmpresa",
  "data",
  "cpfConsultor",
  "horas",
  "codCidade",
  "codCategoria",
  "codMeioAtendimento",
  "codTema",
];

/**
 * ExportValidator — valida a lista de DTOs antes da geração do XLSX.
 */
export const ExportValidator = {
  validate(dtos: ConsultoriaExportDTO[]): ExportValidationResult {
    const erros: ExportValidationError[] = [];

    if (!dtos.length) {
      erros.push({ linha: 0, campo: "-", mensagem: "Nenhuma consultoria para exportar." });
      return { valido: false, erros };
    }

    dtos.forEach((d, idx) => {
      const linha = idx + 1;

      for (const c of REQUIRED) {
        const v = d[c];
        const vazio = v === null || v === undefined || (typeof v === "string" && v.trim() === "");
        if (vazio) erros.push({ linha, campo: c, mensagem: `Campo obrigatório ausente.` });
      }

      if (d.documentoCliente && !/^\d{11}$/.test(d.documentoCliente)) {
        erros.push({ linha, campo: "documentoCliente", mensagem: "CPF do cliente deve ter 11 dígitos numéricos." });
      }
      if (d.cpfConsultor && !/^\d{11}$/.test(d.cpfConsultor)) {
        erros.push({ linha, campo: "cpfConsultor", mensagem: "CPF do consultor deve ter 11 dígitos numéricos." });
      }
      if (d.documentoEmpresa && !/^\d{14}$/.test(d.documentoEmpresa)) {
        erros.push({ linha, campo: "documentoEmpresa", mensagem: "CNPJ da empresa deve ter 14 dígitos numéricos." });
      }
      if (!(Number(d.horas) > 0)) {
        erros.push({ linha, campo: "horas", mensagem: "Horas deve ser maior que zero." });
      }
      if (d.data && !/^\d{4}-\d{2}-\d{2}$/.test(d.data)) {
        erros.push({ linha, campo: "data", mensagem: "Data inválida (esperado ISO yyyy-mm-dd)." });
      }
    });

    return { valido: erros.length === 0, erros };
  },
};
