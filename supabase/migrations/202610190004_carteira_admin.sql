-- Altera somente a identificação do administrador, preservando senha e vínculos.
UPDATE public.usuarios SET carteira = '900001'
WHERE carteira = '1000' AND perfil = 'admin';
