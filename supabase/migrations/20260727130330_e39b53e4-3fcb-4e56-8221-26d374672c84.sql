-- Índice para acelerar a validação de conflito de agenda por CPF + data
CREATE INDEX IF NOT EXISTS idx_cronogramas_cpf_data
  ON public.cronogramas (cpf_consultor, data)
  WHERE cpf_consultor IS NOT NULL;

-- Função de validação: mesmo CPF de consultor não pode ter 2 linhas na mesma data
CREATE OR REPLACE FUNCTION public.validar_conflito_agenda_consultor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_cpf text;
  v_conflitos integer;
BEGIN
  v_cpf := regexp_replace(COALESCE(NEW.cpf_consultor, ''), '\D', '', 'g');
  IF v_cpf = '' OR NEW.data IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_conflitos
  FROM public.cronogramas c
  WHERE regexp_replace(COALESCE(c.cpf_consultor, ''), '\D', '', 'g') = v_cpf
    AND c.data = NEW.data
    AND c.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_conflitos > 0 THEN
    RAISE EXCEPTION 'Consultor já possui atendimento registrado nesta data.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cronogramas_conflito_agenda ON public.cronogramas;
CREATE TRIGGER trg_cronogramas_conflito_agenda
  BEFORE INSERT OR UPDATE OF cpf_consultor, data
  ON public.cronogramas
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_conflito_agenda_consultor();