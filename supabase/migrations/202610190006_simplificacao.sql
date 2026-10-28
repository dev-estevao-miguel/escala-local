-- Convites gerais e configuração única de área. Preserva pessoas e histórico.
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS pode_definir_area INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.convites ALTER COLUMN area_id DROP NOT NULL;
ALTER TABLE public.convites ALTER COLUMN expira_em DROP NOT NULL;
ALTER TABLE public.convites ALTER COLUMN max_uses DROP NOT NULL;
ALTER TABLE public.convites ADD COLUMN IF NOT EXISTS token_cifrado TEXT;
-- Links anteriores não permitem recuperar o token para copiar novamente.
UPDATE public.convites SET revogado=1,revogado_em=CURRENT_TIMESTAMP::text WHERE revogado=0;
CREATE UNIQUE INDEX convite_geral_coordenador ON public.convites(perfil) WHERE area_id IS NULL AND perfil='coordenador' AND revogado=0;
CREATE UNIQUE INDEX convite_responsaveis_area ON public.convites(area_id) WHERE perfil='pb' AND revogado=0;
ALTER TABLE public.cultos ADD COLUMN IF NOT EXISTS nome_evento TEXT NOT NULL DEFAULT '';
ALTER TABLE public.cultos ADD COLUMN IF NOT EXISTS local_evento TEXT NOT NULL DEFAULT '';
-- Arquivo inacessível pela aplicação; nenhuma perda dos registros antigos.
ALTER TABLE public.compromissos_oficiais RENAME TO compromissos_legados;
UPDATE public.usuarios SET area_id=NULL,congregacao_id=NULL,gerencia_escala=0 WHERE perfil='admin';
ALTER TABLE public.usuarios ADD CONSTRAINT admin_sem_area CHECK(perfil<>'admin' OR (area_id IS NULL AND congregacao_id IS NULL));
