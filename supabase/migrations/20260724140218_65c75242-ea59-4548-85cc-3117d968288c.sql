CREATE TABLE public.export_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  usuario text,
  geracao_id uuid,
  projeto_id uuid,
  nome_arquivo text NOT NULL,
  quantidade_registros integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sucesso',
  mensagem_erro text,
  data_exportacao timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.export_history TO authenticated;
GRANT ALL ON public.export_history TO service_role;
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY export_history_own ON public.export_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_export_history_user_date ON public.export_history(user_id, data_exportacao DESC);