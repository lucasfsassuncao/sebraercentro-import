/**
 * DTO oficial de exportação de consultorias para o layout do Sebrae.
 * A ORDEM dos campos aqui reflete a ORDEM EXATA das colunas do Excel.
 * 
 * Compatível com AMBOS os modelos:
 * - ANTIGO: cronogramas → companies → consultor (campo solto)
 * - NOVO:   atendimentos → consultor (relacionamento direto)
 */
export interface ConsultoriaExportDTO {
  codDisponibilizacao: string; // TEXTO (preserva zeros à esquerda)
  documentoCliente: string; // CPF, apenas dígitos
  documentoEmpresa: string; // CNPJ, apenas dígitos
  data: string; // ISO yyyy-mm-dd
  hora: string; // HH:mm (pode vir vazio)
  cpfConsultor: string; // CPF, apenas dígitos ← CRÍTICO: agora vem de atendimento.consultor
  horas: number; // decimal
  descricao: string;
  codCidade: string; // IBGE - TEXTO
  codCategoria: string; // TEXTO
  codMeioAtendimento: string; // TEXTO
  codTema: string; // TEXTO
}

export const EXPORT_COLUMNS: {
  header: string;
  key: keyof ConsultoriaExportDTO;
  width: number;
  type: "text" | "date" | "number";
}[] = [
  {
    header: "Cod_disponibilizacao",
    key: "codDisponibilizacao",
    width: 20,
    type: "text",
  },
  {
    header: "Documento_cliente",
    key: "documentoCliente",
    width: 18,
    type: "text",
  },
  {
    header: "Documento_empresa",
    key: "documentoEmpresa",
    width: 20,
    type: "text",
  },
  { header: "Data", key: "data", width: 18, type: "date" },
  { header: "Cpf_consultor", key: "cpfConsultor", width: 16, type: "text" },
  { header: "Horas", key: "horas", width: 8, type: "number" },
  { header: "Descricao", key: "descricao", width: 80, type: "text" },
  { header: "Cod_cidade", key: "codCidade", width: 12, type: "text" },
  { header: "Cod_categoria", key: "codCategoria", width: 12, type: "text" },
  {
    header: "Cod_meio_atendimento",
    key: "codMeioAtendimento",
    width: 18,
    type: "text",
  },
  { header: "Cod_tema", key: "codTema", width: 10, type: "text" },
];
