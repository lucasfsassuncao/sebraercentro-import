
-- Projetos: novos campos herdáveis
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS codigo_ibge text,
  ADD COLUMN IF NOT EXISTS cpf_consultor text,
  ADD COLUMN IF NOT EXISTS codigo_tema text,
  ADD COLUMN IF NOT EXISTS codigo_disponibilizacao text,
  ADD COLUMN IF NOT EXISTS codigo_categoria text,
  ADD COLUMN IF NOT EXISTS codigo_meio_atendimento text,
  ADD COLUMN IF NOT EXISTS descricao_padrao text,
  ADD COLUMN IF NOT EXISTS data_inicial date;

-- Cronogramas (linhas de atendimento gerado)
CREATE TABLE IF NOT EXISTS public.cronogramas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  geracao_id uuid,
  data date NOT NULL,
  horas numeric NOT NULL DEFAULT 0,
  etapa text,
  ordem integer NOT NULL DEFAULT 0,
  consultor text,
  cpf_consultor text,
  municipio text,
  codigo_ibge text,
  codigo_tema text,
  codigo_categoria text,
  codigo_meio_atendimento text,
  codigo_disponibilizacao text,
  descricao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cronogramas TO authenticated;
GRANT ALL ON public.cronogramas TO service_role;
ALTER TABLE public.cronogramas ENABLE ROW LEVEL SECURITY;
CREATE POLICY cronogramas_own ON public.cronogramas FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_cronogramas_updated BEFORE UPDATE ON public.cronogramas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_cronogramas_empresa ON public.cronogramas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cronogramas_projeto ON public.cronogramas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_cronogramas_geracao ON public.cronogramas(geracao_id);

-- Registro de gerações (histórico consolidado)
CREATE TABLE IF NOT EXISTS public.cronograma_geracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  usuario text,
  total_empresas integer NOT NULL DEFAULT 0,
  total_atendimentos integer NOT NULL DEFAULT 0,
  total_horas numeric NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cronograma_geracoes TO authenticated;
GRANT ALL ON public.cronograma_geracoes TO service_role;
ALTER TABLE public.cronograma_geracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY cronograma_geracoes_own ON public.cronograma_geracoes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Feriados (preparação para exclusão futura)
CREATE TABLE IF NOT EXISTS public.feriados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data date NOT NULL,
  descricao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feriados TO authenticated;
GRANT ALL ON public.feriados TO service_role;
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;
CREATE POLICY feriados_own ON public.feriados FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
