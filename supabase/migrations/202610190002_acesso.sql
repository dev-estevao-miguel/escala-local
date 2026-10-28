ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS nascimento TEXT NOT NULL DEFAULT '';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS gerencia_escala INTEGER NOT NULL DEFAULT 0 CHECK (gerencia_escala IN (0, 1));
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS credencial_versao INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.convites ADD COLUMN IF NOT EXISTS perfil TEXT NOT NULL DEFAULT 'obreiro' CHECK (perfil IN ('coordenador', 'vice', 'pb', 'obreiro'));
ALTER TABLE public.convites ADD COLUMN IF NOT EXISTS usado_por INTEGER REFERENCES public.usuarios(id);
CREATE TABLE IF NOT EXISTS public.tentativas_login (
  chave TEXT PRIMARY KEY,
  tentativas INTEGER NOT NULL DEFAULT 0,
  janela BIGINT NOT NULL
);
ALTER TABLE public.tentativas_login ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tentativas_login FROM anon, authenticated;

-- Uma trava por área impede ultrapassar o limite com pedidos simultâneos.
CREATE OR REPLACE FUNCTION public.validar_delegacao() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE area INTEGER; total INTEGER;
BEGIN
  IF NEW.gerencia_escala = 1 THEN
    IF NEW.perfil NOT IN ('obreiro', 'pb') THEN RAISE EXCEPTION 'Delegação disponível apenas para obreiros e Pbs.'; END IF;
    SELECT area_id INTO area FROM public.congregacoes WHERE id = NEW.congregacao_id;
    PERFORM pg_advisory_xact_lock(26123302, area);
    SELECT COUNT(*) INTO total FROM public.usuarios u JOIN public.congregacoes g ON g.id=u.congregacao_id
      WHERE g.area_id=area AND u.gerencia_escala=1 AND u.id<>NEW.id;
    IF total >= 2 THEN RAISE EXCEPTION 'Limite de dois responsáveis por escala na área.'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS limite_delegados ON public.usuarios;
CREATE TRIGGER limite_delegados BEFORE INSERT OR UPDATE OF gerencia_escala, congregacao_id ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.validar_delegacao();

CREATE INDEX IF NOT EXISTS usuarios_congregacao_status ON public.usuarios(congregacao_id, status);
CREATE INDEX IF NOT EXISTS convites_area ON public.convites(area_id);
CREATE INDEX IF NOT EXISTS escalas_usuario ON public.escalas(usuario_id);
