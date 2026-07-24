/**
 * Service para exportar Atendimentos
 * Interface simples para button/trigger em componentes
 */
import { ExportService } from "./export-service";
import { toast } from "sonner";

export async function exportarAtendimentosComToast(
  projetoId: string,
  dataInicio?: string,
  dataFim?: string
) {
  try {
    const result = await ExportService.exportarAtendimentos(
      projetoId,
      dataInicio,
      dataFim
    );

    if (result.ok) {
      toast.success(
        `Exportado: ${result.filename} (${result.quantidade} registros)`
      );
      return result;
    } else {
      toast.error(result.mensagem || "Falha na exportação");
      if (result.erros?.length) {
        result.erros
          .slice(0, 5)
          .forEach((e) =>
            toast.error(`Linha ${e.linha} · ${e.campo}: ${e.mensagem}`)
          );
      }
      return result;
    }
  } catch (err: any) {
    toast.error(err.message || "Erro ao exportar");
    throw err;
  }
}
