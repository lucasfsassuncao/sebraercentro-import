import { supabase } from "@/integrations/supabase/client";
import { 
  ETAPAS, 
  MAX_HORAS_DIA, 
  blocosPorEtapa, 
  parseISO, 
  toISO, 
  proximoAposDiaUtil, 
  gerarDatas, 
  proximoDiaUtil,
  totalHoras,
  type Etapa 
} from "./horas";

export interface Projeto {
  id: string;
  consultor?: string | null;
  cpf_consultor?: string | null;
  municipio?: string | null;
  codigo_ibge?: string | null;
  codigo_tema?: string | null;
  codigo_disponibilizacao?: string | null;
  codigo_categoria?: string | null;
  codigo_meio_atendimento?: string | null;
  descricao_padrao?: string | null;
  data_inicial?: string | null;
  modelo?: string | null;
}

export interface Empresa {
  id: string;
  razao_social: string;
  porte?: string | null;
  modelo?: string | null;
  consultor?: string | null;
  municipio?: string | null;
  codigo_ibge?: string | null;
  codigo_tema?: string | null;
  codigo_disponibilizacao?: string | null;
  codigo_categoria?: string | null;
  codigo_meio_atendimento?: string | null;
  descricao?: string | null;
  etapa_t0: boolean;
  etapa_t1: boolean;
  etapa_t2: boolean;
  etapa_t3: boolean;
  etapa_t4: boolean;
  ultima_data?: string | null;
  horas_lancadas: number;
  horas_previstas: number;
}

export interface LinhaCronograma {
  data: string;
  horas: number;
  etapa: Etapa;
  descricao: string;
}

export interface ValidacaoResultado {
  valido: boolean;
  mensagem?: string;
}

/**
 * Busca todos os feriados cadastrados para o usuário logado.
 */
export async function obterFeriados(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from("feriados")
      .select("data")
      .eq("user_id", userId);
    
    if (error) {
      console.error("Erro ao buscar feriados:", error);
      return new Set();
    }
    
    return new Set((data ?? []).map((f) => f.data));
  } catch (err) {
    console.error("Erro na busca de feriados:", err);
    return new Set();
  }
}

/**
 * Gera as linhas de cronograma automáticas para uma única empresa com base em suas etapas selecionadas.
 */
export function gerarLinhasParaEmpresa(
  projeto: Projeto,
  empresa: Empresa,
  feriados: Set<string> = new Set()
): LinhaCronograma[] {
  const etapasSel = ETAPAS.filter((t) => empresa[`etapa_${t.toLowerCase()}` as keyof Empresa]) as Etapa[];
  
  // O modelo da empresa tem prioridade sobre o modelo do projeto
  const modeloEfetivo = empresa.modelo || projeto.modelo;
  const porteEfetivo = empresa.porte || "ME";
  const blocos = blocosPorEtapa(modeloEfetivo, porteEfetivo, etapasSel);
  
  if (blocos.length === 0) return [];
  
  // Determina a data inicial baseada nas regras de continuidade
  let base: Date;
  if (empresa.ultima_data) {
    // Se existir histórico, continuar automaticamente a partir do próximo dia útil
    base = proximoAposDiaUtil(parseISO(empresa.ultima_data), feriados);
  } else if (projeto.data_inicial) {
    // Se não existir histórico, iniciar a partir da data definida no projeto
    base = proximoDiaUtil(parseISO(projeto.data_inicial), feriados);
  } else {
    // Caso contrário, inicia a partir de hoje
    base = proximoDiaUtil(new Date(), feriados);
  }
  
  const datas = gerarDatas(base, blocos.length, feriados);
  
  return blocos.map((b, i) => ({
    data: datas[i],
    horas: b.horas,
    etapa: b.etapa,
    descricao: empresa.descricao || projeto.descricao_padrao || "",
  }));
}

/**
 * Valida se um conjunto de linhas de atendimento é consistente e respeita as regras de negócio.
 */
export function validarLinhasCronograma(
  linhas: { data: string; horas: number; etapa: string; id?: string }[],
  horasPrevistas: number
): ValidacaoResultado {
  let totalHoras = 0;
  const horasPorDia: Record<string, number> = {};
  const datasVistas = new Set<string>();

  for (const l of linhas) {
    const horasNum = Number(l.horas);
    
    // Regra: Não permitir horas negativas
    if (isNaN(horasNum) || horasNum < 0) {
      return { valido: false, message: "Não são permitidas horas negativas nos atendimentos." };
    }
    
    // Regra: Não permitir atendimento individual maior que 8 horas
    if (horasNum > MAX_HORAS_DIA) {
      return { valido: false, message: `Nenhum atendimento individual pode exceder ${MAX_HORAS_DIA} horas.` };
    }
    
    if (!l.data) {
      return { valido: false, message: "Todos os atendimentos devem possuir uma data definida." };
    }
    
    if (!l.etapa) {
      return { valido: false, message: "Todos os atendimentos devem possuir uma etapa definida." };
    }

    // Regra: Somar horas por dia por empresa para garantir limite de 8h/dia
    horasPorDia[l.data] = (horasPorDia[l.data] || 0) + horasNum;
    if (horasPorDia[l.data] > MAX_HORAS_DIA) {
      return { 
        valido: false, 
        message: `A empresa possui um total de ${horasPorDia[l.data]}h no dia ${l.data}, ultrapassando o limite diário de ${MAX_HORAS_DIA}h.` 
      };
    }

    // Regra: Detectar datas duplicadas (um atendimento por dia por empresa)
    if (datasVistas.has(l.data)) {
      return { valido: false, message: `A data ${l.data} está duplicada para esta empresa.` };
    }
    datasVistas.add(l.data);

    totalHoras += horasNum;
  }

  // Regra: Não ultrapassar o total previsto das etapas selecionadas
  if (totalHoras > horasPrevistas) {
    return { 
      valido: false, 
      message: `O total de horas lançadas (${totalHoras}h) não pode ultrapassar o total previsto (${horasPrevistas}h).` 
    };
  }

  return { valido: true };
}

/**
 * Recalcula e sincroniza as horas lançadas e a última data de atendimento de uma empresa no banco de dados.
 * Deve ser chamado sempre que um atendimento for criado, atualizado ou excluído.
 */
export async function recalcularHorasEmpresa(empresaId: string): Promise<{ success: boolean; error?: any }> {
  try {
    // 1. Busca todos os atendimentos da empresa no banco
    const { data: linhas, error: errLinhas } = await supabase
      .from("cronogramas")
      .select("horas, data")
      .eq("empresa_id", empresaId);

    if (errLinhas) {
      console.error(`Erro ao buscar cronogramas para empresa ${empresaId}:`, errLinhas);
      return { success: false, error: errLinhas };
    }

    // 2. Calcula a soma das horas e identifica a última data
    const totalLancadas = (linhas ?? []).reduce((sum, current) => sum + Number(current.horas || 0), 0);
    
    let ultimaData: string | null = null;
    if (linhas && linhas.length > 0) {
      const datas = linhas.map((l) => l.data).filter(Boolean);
      if (datas.length > 0) {
        datas.sort();
        ultimaData = datas[datas.length - 1];
      }
    }

    // 3. Atualiza os dados consolidados da empresa no banco
    const { error: errUpdate } = await supabase
      .from("empresas")
      .update({
        horas_lancadas: totalLancadas,
        ultima_data: ultimaData
      })
      .eq("id", empresaId);

    if (errUpdate) {
      console.error(`Erro ao atualizar horas da empresa ${empresaId}:`, errUpdate);
      return { success: false, error: errUpdate };
    }

    return { success: true };
  } catch (err) {
    console.error(`Erro inesperado no recálculo da empresa ${empresaId}:`, err);
    return { success: false, error: err };
  }
}
