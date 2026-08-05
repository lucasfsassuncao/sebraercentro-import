
CREATE OR REPLACE FUNCTION public.recalcular_status_empresa(_empresa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_horas numeric := 0;
  v_ultima date;
  v_prev numeric := 0;
  v_qtd integer := 0;
  v_status text;
BEGIN
  IF _empresa_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(c.horas), 0), MAX(c.data), COUNT(*)
    INTO v_horas, v_ultima, v_qtd
  FROM public.cronogramas c
  WHERE c.empresa_id = _empresa_id;

  SELECT COALESCE(e.horas_previstas, 0) INTO v_prev
  FROM public.empresas e WHERE e.id = _empresa_id;

  IF v_qtd = 0 THEN
    v_status := 'pendente';
  ELSIF v_prev > 0 AND v_horas >= v_prev THEN
    v_status := 'concluida';
  ELSE
    v_status := 'em_andamento';
  END IF;

  UPDATE public.empresas e
     SET horas_lancadas = v_horas,
         ultima_data = v_ultima,
         status = v_status
   WHERE e.id = _empresa_id
     AND (e.horas_lancadas IS DISTINCT FROM v_horas
       OR e.ultima_data IS DISTINCT FROM v_ultima
       OR e.status IS DISTINCT FROM v_status);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalcular_status_empresa(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_cronogramas_status_empresa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.recalcular_status_empresa(NEW.empresa_id);
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF OLD.empresa_id IS DISTINCT FROM COALESCE(NEW.empresa_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      PERFORM public.recalcular_status_empresa(OLD.empresa_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trg_cronogramas_status_empresa() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cronogramas_status_empresa ON public.cronogramas;
CREATE TRIGGER trg_cronogramas_status_empresa
AFTER INSERT OR UPDATE OR DELETE ON public.cronogramas
FOR EACH ROW EXECUTE FUNCTION public.trg_cronogramas_status_empresa();

CREATE OR REPLACE FUNCTION public.trg_empresas_status_auto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_horas numeric := 0;
  v_ultima date;
  v_qtd integer := 0;
BEGIN
  SELECT COALESCE(SUM(c.horas), 0), MAX(c.data), COUNT(*)
    INTO v_horas, v_ultima, v_qtd
  FROM public.cronogramas c
  WHERE c.empresa_id = NEW.id;

  NEW.horas_lancadas := v_horas;
  NEW.ultima_data := v_ultima;

  IF v_qtd = 0 THEN
    NEW.status := 'pendente';
  ELSIF COALESCE(NEW.horas_previstas, 0) > 0 AND v_horas >= NEW.horas_previstas THEN
    NEW.status := 'concluida';
  ELSE
    NEW.status := 'em_andamento';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trg_empresas_status_auto() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_empresas_status_auto ON public.empresas;
CREATE TRIGGER trg_empresas_status_auto
BEFORE INSERT OR UPDATE ON public.empresas
FOR EACH ROW EXECUTE FUNCTION public.trg_empresas_status_auto();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.empresas LOOP
    PERFORM public.recalcular_status_empresa(r.id);
  END LOOP;
END $$;
