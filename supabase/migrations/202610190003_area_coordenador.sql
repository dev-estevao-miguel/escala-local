ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS configurada INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS quantidade_prevista INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.congregacoes ADD COLUMN IF NOT EXISTS habilitada INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS congregacoes_habilitadas ON public.congregacoes(area_id,habilitada);
-- O catálogo serve de referência. Igrejas e eventos só são ativados pela coordenação.
