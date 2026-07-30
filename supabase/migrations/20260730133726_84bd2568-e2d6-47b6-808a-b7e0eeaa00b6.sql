ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS consultor text,
  ADD COLUMN IF NOT EXISTS cpf_consultor text;

UPDATE public.empresas e
SET consultor = COALESCE(e.consultor, p.consultor),
    cpf_consultor = COALESCE(e.cpf_consultor, p.cpf_consultor)
FROM public.projetos p
WHERE p.id = e.projeto_id
  AND (e.consultor IS NULL OR e.cpf_consultor IS NULL);

CREATE INDEX IF NOT EXISTS idx_empresas_cpf_consultor ON public.empresas (cpf_consultor);