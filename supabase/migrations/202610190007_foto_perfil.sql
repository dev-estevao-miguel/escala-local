ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS foto_perfil TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS foto_versao INTEGER NOT NULL DEFAULT 0;
-- A tabela permanece protegida pelas políticas RLS existentes.
