ALTER TABLE usuarios ADD COLUMN foto_perfil TEXT;
ALTER TABLE usuarios ADD COLUMN foto_versao INTEGER NOT NULL DEFAULT 0;
INSERT INTO escala_migrations(nome) VALUES ('007_foto_perfil');
