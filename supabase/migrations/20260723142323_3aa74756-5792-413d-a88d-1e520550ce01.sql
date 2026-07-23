
-- Remove redundant columns from empresas (all inherited from projeto)
ALTER TABLE public.empresas
  DROP COLUMN IF EXISTS municipio,
  DROP COLUMN IF EXISTS codigo_ibge,
  DROP COLUMN IF EXISTS modelo,
  DROP COLUMN IF EXISTS consultor,
  DROP COLUMN IF EXISTS codigo_tema,
  DROP COLUMN IF EXISTS codigo_categoria,
  DROP COLUMN IF EXISTS codigo_meio_atendimento,
  DROP COLUMN IF EXISTS codigo_disponibilizacao,
  DROP COLUMN IF EXISTS descricao;

-- Índices para performance (centenas de empresas por projeto e consultas de cronograma)
CREATE INDEX IF NOT EXISTS idx_empresas_projeto ON public.empresas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_empresas_user ON public.empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_cronogramas_projeto ON public.cronogramas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_cronogramas_empresa ON public.cronogramas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cronogramas_geracao ON public.cronogramas(geracao_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_geracoes_projeto ON public.cronograma_geracoes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_historico_projeto ON public.historico(projeto_id);
CREATE INDEX IF NOT EXISTS idx_feriados_data ON public.feriados(data);
