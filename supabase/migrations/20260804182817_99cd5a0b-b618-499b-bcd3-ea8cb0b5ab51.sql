ALTER TABLE public.cronogramas ADD COLUMN IF NOT EXISTS hora text;

CREATE OR REPLACE FUNCTION public.validar_conflito_agenda_consultor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_cpf text;
  v_conflitos integer;
  v_total_dia integer;
BEGIN
  v_cpf := regexp_replace(COALESCE(NEW.cpf_consultor, ''), '\D', '', 'g');
  IF v_cpf = '' OR NEW.data IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.hora IS NULL OR NEW.hora = '' THEN
    SELECT COUNT(*) INTO v_conflitos
    FROM public.cronogramas c
    WHERE regexp_replace(COALESCE(c.cpf_consultor, ''), '\D', '', 'g') = v_cpf
      AND c.data = NEW.data
      AND c.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  ELSE
    SELECT COUNT(*) INTO v_conflitos
    FROM public.cronogramas c
    WHERE regexp_replace(COALESCE(c.cpf_consultor, ''), '\D', '', 'g') = v_cpf
      AND c.data = NEW.data
      AND c.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (c.hora IS NULL OR c.hora = '' OR c.hora = NEW.hora);
  END IF;

  IF v_conflitos > 0 THEN
    RAISE EXCEPTION 'Consultor já possui atendimento registrado nesta data.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.hora IS NOT NULL AND NEW.hora <> '' THEN
    SELECT COUNT(*) INTO v_total_dia
    FROM public.cronogramas c
    WHERE regexp_replace(COALESCE(c.cpf_consultor, ''), '\D', '', 'g') = v_cpf
      AND c.data = NEW.data
      AND c.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF v_total_dia >= 4 THEN
      RAISE EXCEPTION 'Consultor já possui o limite de 4 atendimentos nesta data.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.validar_conflito_agenda_consultor() FROM PUBLIC, anon, authenticated;