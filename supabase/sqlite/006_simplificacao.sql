ALTER TABLE usuarios ADD COLUMN pode_definir_area INTEGER NOT NULL DEFAULT 0;
CREATE TABLE convites_revisados (
 token TEXT PRIMARY KEY,criado_por INTEGER NOT NULL REFERENCES usuarios(id),
 area_id INTEGER REFERENCES areas(id),congregacao_id INTEGER REFERENCES congregacoes(id),
 expira_em TEXT,revogado INTEGER NOT NULL DEFAULT 0,criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 perfil TEXT NOT NULL DEFAULT 'obreiro',usado_por INTEGER REFERENCES usuarios(id),
 tipo TEXT NOT NULL DEFAULT 'CHURCH_WORKER',max_uses INTEGER,current_uses INTEGER NOT NULL DEFAULT 0,
 usado_em TEXT,revogado_em TEXT,token_cifrado TEXT
);
INSERT INTO convites_revisados(token,criado_por,area_id,congregacao_id,expira_em,revogado,criado_em,perfil,usado_por,tipo,max_uses,current_uses,usado_em,revogado_em)
 SELECT token,criado_por,area_id,congregacao_id,expira_em,1,criado_em,perfil,usado_por,tipo,max_uses,current_uses,usado_em,CURRENT_TIMESTAMP FROM convites;
DROP TABLE convites;
ALTER TABLE convites_revisados RENAME TO convites;
CREATE UNIQUE INDEX convite_geral_coordenador ON convites(perfil) WHERE area_id IS NULL AND perfil='coordenador' AND revogado=0;
CREATE UNIQUE INDEX convite_responsaveis_area ON convites(area_id) WHERE perfil='pb' AND revogado=0;
ALTER TABLE cultos ADD COLUMN nome_evento TEXT NOT NULL DEFAULT '';
ALTER TABLE cultos ADD COLUMN local_evento TEXT NOT NULL DEFAULT '';
ALTER TABLE compromissos_oficiais RENAME TO compromissos_legados;
UPDATE usuarios SET area_id=NULL,congregacao_id=NULL,gerencia_escala=0 WHERE perfil='admin';
CREATE TRIGGER admin_sem_area_insert BEFORE INSERT ON usuarios
 WHEN NEW.perfil='admin' AND (NEW.area_id IS NOT NULL OR NEW.congregacao_id IS NOT NULL)
 BEGIN SELECT RAISE(ABORT,'Administrador sem vinculo de area ou congregacao'); END;
CREATE TRIGGER admin_sem_area_update BEFORE UPDATE OF perfil,area_id,congregacao_id ON usuarios
 WHEN NEW.perfil='admin' AND (NEW.area_id IS NOT NULL OR NEW.congregacao_id IS NOT NULL)
 BEGIN SELECT RAISE(ABORT,'Administrador sem vinculo de area ou congregacao'); END;
INSERT INTO escala_migrations(nome) VALUES ('006_simplificacao');
