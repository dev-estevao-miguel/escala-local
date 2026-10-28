CREATE TABLE publicacoes_escala (
 id INTEGER PRIMARY KEY,
 area_id INTEGER NOT NULL REFERENCES areas(id),
 publicado_por INTEGER REFERENCES usuarios(id),
 inicio TEXT NOT NULL,fim TEXT NOT NULL,quantidade INTEGER NOT NULL,
 criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')),
 notificado_em TEXT,notificado_por INTEGER REFERENCES usuarios(id),destinatarios INTEGER NOT NULL DEFAULT 0,
 CHECK(fim>=inicio),CHECK(quantidade>0)
);
ALTER TABLE escalas ADD COLUMN publicacao_id INTEGER REFERENCES publicacoes_escala(id) ON DELETE SET NULL;
CREATE INDEX escalas_publicacao ON escalas(publicacao_id);
CREATE INDEX publicacoes_area ON publicacoes_escala(area_id,id);
CREATE TABLE notificacoes (
 id INTEGER PRIMARY KEY,usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 publicacao_id INTEGER NOT NULL REFERENCES publicacoes_escala(id) ON DELETE CASCADE,
 titulo TEXT NOT NULL,mensagem TEXT NOT NULL,link TEXT NOT NULL,
 criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')),lida_em TEXT,
 UNIQUE(publicacao_id,usuario_id)
);
CREATE INDEX notificacoes_usuario ON notificacoes(usuario_id,lida_em,id);
-- Inclui as escalas já publicadas, sem enviar mensagens nem alterar atribuições.
INSERT INTO publicacoes_escala(area_id,publicado_por,inicio,fim,quantidade,criado_em)
 SELECT g.area_id,COALESCE(e.autorizado_por,e.indicado_por),MIN(c.data),MAX(c.data),COUNT(*),MAX(e.criado_em)
 FROM escalas e JOIN cultos c ON c.id=e.culto_id JOIN congregacoes g ON g.id=c.congregacao_id
 WHERE e.autorizacao='autorizada' AND c.cancelado=0
 GROUP BY g.area_id,COALESCE(e.autorizado_por,e.indicado_por);
UPDATE escalas SET publicacao_id=(SELECT p.id FROM publicacoes_escala p JOIN cultos c ON c.id=escalas.culto_id JOIN congregacoes g ON g.id=c.congregacao_id
 WHERE c.cancelado=0 AND p.area_id=g.area_id AND (p.publicado_por=COALESCE(escalas.autorizado_por,escalas.indicado_por) OR (p.publicado_por IS NULL AND COALESCE(escalas.autorizado_por,escalas.indicado_por) IS NULL)) LIMIT 1)
 WHERE autorizacao='autorizada';
INSERT INTO escala_migrations(nome) VALUES('008_notificacoes');
