import ExcelJS from "exceljs";
import { EXPORT_COLUMNS, type ConsultoriaExportDTO } from "./dto";

function isoToBRDateTime(iso: string, hora: string): string {
  // yyyy-mm-dd -> dd/MM/yyyy; concatena hora quando informada
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const data = `${m[3]}/${m[2]}/${m[1]}`;
  const h = hora?.trim();
  return h ? `${data} ${h}` : data;
}

/**
 * Gera um Buffer XLSX no layout oficial Sebrae a partir dos DTOs validados.
 * - Aba única "Planilha1"
 * - Cabeçalhos exatamente como o layout
 * - Códigos e documentos como TEXTO (preserva zeros à esquerda)
 * - Data como dd/MM/yyyy
 * - Horas com formato 0,00
 */
export async function buildConsultoriasXLSX(dtos: ConsultoriaExportDTO[]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SIGA Sebrae Centro";
  wb.created = new Date();

  const ws = wb.addWorksheet("Planilha1");

  ws.columns = EXPORT_COLUMNS.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  // Cabeçalho em negrito
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };

  for (const d of dtos) {
    const row: Record<string, unknown> = {
      codDisponibilizacao: d.codDisponibilizacao,
      documentoCliente:    d.documentoCliente,
      documentoEmpresa:    d.documentoEmpresa,
      data:                isoToBRDate(d.data),
      cpfConsultor:        d.cpfConsultor,
      horas:               Number(d.horas) || 0,
      descricao:           d.descricao,
      codCidade:           d.codCidade,
      codCategoria:        d.codCategoria,
      codMeioAtendimento:  d.codMeioAtendimento,
      codTema:             d.codTema,
    };
    ws.addRow(row);
  }

  // Aplicar formatos por coluna
  EXPORT_COLUMNS.forEach((col, idx) => {
    const column = ws.getColumn(idx + 1);
    if (col.type === "text") {
      column.numFmt = "@"; // texto
      column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber === 1) return;
        // Força string para preservar zeros à esquerda
        cell.value = cell.value == null ? "" : String(cell.value);
        cell.numFmt = "@";
      });
    } else if (col.type === "date") {
      // Mantemos como string dd/MM/yyyy — formato de texto para não haver conversão implícita
      column.numFmt = "@";
      column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber === 1) return;
        cell.numFmt = "@";
      });
    } else if (col.type === "number") {
      column.numFmt = "0.00";
      column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber === 1) return;
        cell.numFmt = "0.00";
      });
    }
  });

  return await wb.xlsx.writeBuffer();
}

export function downloadXLSX(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
