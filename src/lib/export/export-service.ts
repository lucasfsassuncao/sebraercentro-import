import { supabase } from "@/integrations/supabase/client";
import { ConsultoriaExportMapper, type MapperInput } from "./mapper";
import { ExportValidator, type ExportValidationError } from "./validator";
import { buildConsultoriasXLSX, downloadXLSX } from "./excel-builder";

export interface ExportResult {
  ok: boolean;
  filename: string;
  quantidade: number;
  erros?: ExportValidationError[];
  mensagem?: string;
}

function ts(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function sanitize(s: string): string {
  return (s || "export").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 60);
}

async function registrarHistorico(params: {
  geracaoId?: string | null;
  projetoId?: string | null;
  nomeArquivo: string;
  quantidade: number;
  status: "sucesso" | "falha";
  mensagemErro?: string | null;
}) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return;
  await supabase.from("export_history").insert({
    user_id: user.id,
    usuario: user.email ?? null,
    geracao_id: params.geracaoId ?? null,
    projeto_id: params.projetoId ?? null,
    nome_arquivo: params.nomeArquivo,
    quantidade_registros: params.quantidade,
    status: params.status,
    mensagem_erro: params.mensagemErro ?? null,
  });
}

/**
 * ExportService — orquestra: busca → mapeia → valida → gera XLSX → download → histórico.
 * Exporta as consultorias de uma geração específica.
 */
export const ExportService = {
  async exportarGeracao(geracaoId: string): Promise<ExportResult> {
    // 1. Busca da geração + linhas
    const { data: geracao, error: eg } = await supabase
      .from("cronograma_geracoes").select("*").eq("id", geracaoId).maybeSingle();
    if (eg || !geracao) {
      const msg = eg?.message || "Geração não encontrada.";
      const filename = `consultorias_${ts()}.xlsx`;
      await registrarHistorico({ geracaoId, nomeArquivo: filename, quantidade: 0, status: "falha", mensagemErro: msg });
      return { ok: false, filename, quantidade: 0, mensagem: msg };
    }

    const [{ data: linhas, error: el }, { data: projeto }] = await Promise.all([
      supabase.from("cronogramas").select("*").eq("geracao_id", geracaoId).order("data").order("ordem"),
      supabase.from("projetos").select("*").eq("id", geracao.projeto_id).maybeSingle(),
    ]);

    if (el) {
      const filename = `consultorias_${ts()}.xlsx`;
      await registrarHistorico({ geracaoId, projetoId: geracao.projeto_id, nomeArquivo: filename, quantidade: 0, status: "falha", mensagemErro: el.message });
      return { ok: false, filename, quantidade: 0, mensagem: el.message };
    }

    const empresaIds = Array.from(new Set((linhas ?? []).map((l) => l.empresa_id)));
    const { data: empresas } = empresaIds.length
      ? await supabase.from("empresas").select("*").in("id", empresaIds)
      : { data: [] as any[] };

    const empresaById = new Map<string, any>((empresas ?? []).map((e: any) => [e.id, e]));

    // 2. Mapeamento
    const inputs: MapperInput[] = (linhas ?? []).map((l: any) => ({
      linha: l,
      projeto: projeto as any,
      empresa: empresaById.get(l.empresa_id) ?? null,
    }));
    const dtos = ConsultoriaExportMapper.toDTOList(inputs);

    // 3. Validação
    const validacao = ExportValidator.validate(dtos);
    const filename = `consultorias_${sanitize(projeto?.nome || "geracao")}_${ts()}.xlsx`;

    if (!validacao.valido) {
      const msg = `${validacao.erros.length} erro(s) de validação`;
      await registrarHistorico({
        geracaoId, projetoId: geracao.projeto_id, nomeArquivo: filename,
        quantidade: dtos.length, status: "falha",
        mensagemErro: validacao.erros.slice(0, 10).map((e) => `L${e.linha} ${e.campo}: ${e.mensagem}`).join(" | "),
      });
      return { ok: false, filename, quantidade: dtos.length, erros: validacao.erros, mensagem: msg };
    }

    // 4. Geração + download
    try {
      const buffer = await buildConsultoriasXLSX(dtos);
      downloadXLSX(buffer, filename);
      await registrarHistorico({
        geracaoId, projetoId: geracao.projeto_id, nomeArquivo: filename,
        quantidade: dtos.length, status: "sucesso",
      });
      return { ok: true, filename, quantidade: dtos.length };
    } catch (err: any) {
      const msg = err?.message || "Falha ao gerar arquivo XLSX.";
      await registrarHistorico({
        geracaoId, projetoId: geracao.projeto_id, nomeArquivo: filename,
        quantidade: dtos.length, status: "falha", mensagemErro: msg,
      });
      return { ok: false, filename, quantidade: dtos.length, mensagem: msg };
    }
  },
};
