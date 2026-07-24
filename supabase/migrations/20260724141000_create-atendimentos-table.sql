-- Migration: Create atendimentos table with schedule conflict validation
-- This migration implements the new architecture:
-- Projeto (1:N) -> Empresa Atendida (1:N) -> Atendimento (N:1) -> Consultor

-- 1. Create empresas_atendidas table (will eventually replace/supplement empresas)
CREATE TABLE IF NOT EXISTS public.empresas_atendidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  cnpj TEXT,
  cidade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas_atendidas TO authenticated;
GRANT ALL ON public.empresas_atendidas TO service_role;

ALTER TABLE public.empresas_atendidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresas_atendidas_own" ON public.empresas_atendidas 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_empresas_atendidas_user ON public.empresas_atendidas(user_id);
CREATE INDEX idx_empresas_atendidas_projeto ON public.empresas_atendidas(projeto_id);
CREATE INDEX idx_empresas_atendidas_cnpj ON public.empresas_atendidas(cnpj);

CREATE TRIGGER empresas_atendidas_updated BEFORE UPDATE ON public.empresas_atendidas 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Create consultores table if not exists (will remove projeto_id reference later)
-- For now, we keep it compatible with existing data
CREATE TABLE IF NOT EXISTS public.consultores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  email TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultores TO authenticated;
GRANT ALL ON public.consultores TO service_role;

ALTER TABLE public.consultores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultores_own" ON public.consultores 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_consultores_user ON public.consultores(user_id);
CREATE INDEX idx_consultores_cpf ON public.consultores(cpf);

CREATE TRIGGER consultores_updated BEFORE UPDATE ON public.consultores 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Create atendimentos table (core new entity)
CREATE TABLE IF NOT EXISTS public.atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas_atendidas(id) ON DELETE CASCADE,
  consultor_id UUID NOT NULL REFERENCES public.consultores(id) ON DELETE RESTRICT,
  data DATE NOT NULL,
  horas DECIMAL(5, 2) NOT NULL,
  descricao TEXT,
  categoria TEXT,
  meio_atendimento TEXT,
  tema TEXT,
  cidade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_horas_positiva CHECK (horas > 0),
  CONSTRAINT ck_data_not_future CHECK (data <= CURRENT_DATE)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atendimentos TO authenticated;
GRANT ALL ON public.atendimentos TO service_role;

ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atendimentos_own" ON public.atendimentos 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for common queries and schedule conflict checking
CREATE INDEX idx_atendimentos_user ON public.atendimentos(user_id);
CREATE INDEX idx_atendimentos_projeto ON public.atendimentos(projeto_id);
CREATE INDEX idx_atendimentos_empresa ON public.atendimentos(empresa_id);
CREATE INDEX idx_atendimentos_consultor ON public.atendimentos(consultor_id);
CREATE INDEX idx_atendimentos_data ON public.atendimentos(data);
-- CRITICAL: Index for schedule conflict detection
CREATE INDEX idx_atendimentos_consultor_data ON public.atendimentos(consultor_id, data);

CREATE TRIGGER atendimentos_updated BEFORE UPDATE ON public.atendimentos 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Function to validate schedule conflicts
CREATE OR REPLACE FUNCTION public.validar_conflito_agenda_consultor(
  p_consultor_id UUID,
  p_data DATE,
  p_atendimento_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check if consultant already has an appointment on this date
  -- Exclude current appointment if updating
  SELECT COUNT(*) INTO v_count
  FROM public.atendimentos
  WHERE consultor_id = p_consultor_id
    AND data = p_data
    AND (p_atendimento_id IS NULL OR id != p_atendimento_id)
    AND user_id = auth.uid();
  
  -- Return TRUE if no conflicts (count = 0), FALSE if conflict exists
  RETURN v_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Trigger to enforce schedule conflicts before insert/update
CREATE OR REPLACE FUNCTION public.trigger_validar_conflito_agenda()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.validar_conflito_agenda_consultor(NEW.consultor_id, NEW.data, NEW.id) THEN
    RAISE EXCEPTION 'Consultor já possui atendimento registrado nesta data.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_atendimentos_validar_agenda ON public.atendimentos;
CREATE TRIGGER trg_atendimentos_validar_agenda
  BEFORE INSERT OR UPDATE ON public.atendimentos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_validar_conflito_agenda();

-- 6. Function to safely migrate data from cronogramas to atendimentos (if needed)
CREATE OR REPLACE FUNCTION public.migrar_cronogramas_para_atendimentos()
RETURNS TABLE (migrados INTEGER, erros TEXT) AS $$
DECLARE
  v_count INTEGER := 0;
  v_errors TEXT := '';
BEGIN
  -- This function can be called manually to migrate existing cronograma data
  -- For now, it's a placeholder for future data migration needs
  RETURN QUERY SELECT v_count::INTEGER, v_errors;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.atendimentos IS 'Atendimentos: represents each consulting session. Links: Projeto -> Empresa Atendida -> Atendimento <- Consultor';
COMMENT ON TABLE public.empresas_atendidas IS 'Empresas Atendidas: clients/companies served. Links: Projeto -> Empresa Atendida';
COMMENT ON COLUMN public.atendimentos.consultor_id IS 'Foreign key to consultant. A consultant can have multiple appointments, but only one per date.';
COMMENT ON FUNCTION public.validar_conflito_agenda_consultor(UUID, DATE, UUID) IS 'Validates if a consultant has availability on a given date. Returns TRUE if available, FALSE if conflicted.';
