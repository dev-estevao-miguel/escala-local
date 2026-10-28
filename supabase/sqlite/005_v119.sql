-- Base local nova 1.19. Banco legado preservado em escala.db.

CREATE TABLE IF NOT EXISTS areas (
	id INTEGER PRIMARY KEY,
	codigo TEXT NOT NULL UNIQUE,                 -- '57'
	polo TEXT NOT NULL                           -- 'PE-15 Integração 4'
);

CREATE TABLE IF NOT EXISTS congregacoes (
	id INTEGER PRIMARY KEY,
	area_id INTEGER NOT NULL REFERENCES areas(id),
	codigo TEXT NOT NULL UNIQUE,
	nome TEXT NOT NULL,
	endereco TEXT NOT NULL DEFAULT '',
	maps TEXT NOT NULL DEFAULT '',
	sede INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS congregacoes_area ON congregacoes(area_id);

CREATE TABLE IF NOT EXISTS usuarios (
	id INTEGER PRIMARY KEY,
	nome TEXT NOT NULL,
	carteira TEXT NOT NULL UNIQUE,
	senha_hash TEXT NOT NULL,
	trocar_senha INTEGER NOT NULL DEFAULT 0,      -- 1 = entrou com a senha padrão e precisa criar a pessoal
	cargo TEXT NOT NULL,
	perfil TEXT NOT NULL DEFAULT 'obreiro',      -- admin | coordenador | vice | pb | obreiro
	congregacao_id INTEGER REFERENCES congregacoes(id),
	whatsapp TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'pendente',     -- pendente | ativo | recusado | inativo
	motivo_recusa TEXT,
	cadastrado_por INTEGER REFERENCES usuarios(id),
	aprovado_por INTEGER REFERENCES usuarios(id),
	aprovado_em TEXT,
	ultimo_acesso TEXT,
	criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS disponibilidades (
	usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
	dia_semana INTEGER NOT NULL,                 -- 0 = domingo
	turno TEXT NOT NULL,                         -- manha | tarde | noite
	PRIMARY KEY (usuario_id, dia_semana, turno)
);

CREATE TABLE IF NOT EXISTS indisponibilidades (
	id INTEGER PRIMARY KEY,
	usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
	inicio TEXT NOT NULL,
	fim TEXT NOT NULL,
	motivo TEXT NOT NULL DEFAULT ''
);

-- Falhas inesperadas do servidor, acompanhadas pelo Admin da plataforma.
CREATE TABLE IF NOT EXISTS erros (
	id INTEGER PRIMARY KEY,
	quando TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
	metodo TEXT NOT NULL,
	rota TEXT NOT NULL,
	status INTEGER NOT NULL,
	mensagem TEXT NOT NULL,
	detalhe TEXT NOT NULL DEFAULT '',
	usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Configurações internas (ex.: segredo para assinar o cookie de sessão).
CREATE TABLE IF NOT EXISTS config (
	chave TEXT PRIMARY KEY,
	valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS convites (
	token TEXT PRIMARY KEY,
	criado_por INTEGER NOT NULL REFERENCES usuarios(id),
	area_id INTEGER NOT NULL REFERENCES areas(id),
	congregacao_id INTEGER REFERENCES congregacoes(id),
	expira_em TEXT NOT NULL,
	revogado INTEGER NOT NULL DEFAULT 0,
	criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS tipos_culto (
	id INTEGER PRIMARY KEY,
	nome TEXT NOT NULL UNIQUE,
	hora_inicio TEXT NOT NULL DEFAULT '19:00',
	hora_fim TEXT NOT NULL DEFAULT '21:00',
	ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pontos_pregacao (
	id INTEGER PRIMARY KEY,
	congregacao_id INTEGER NOT NULL REFERENCES congregacoes(id),
	nome TEXT NOT NULL,
	endereco TEXT NOT NULL DEFAULT '',
	maps TEXT NOT NULL DEFAULT '',
	ativo INTEGER NOT NULL DEFAULT 1,
	criado_por INTEGER REFERENCES usuarios(id)
);

-- Regras fixas: "toda terça" (semana_mes NULL) ou "2ª terça do mês" (semana_mes = 2).
CREATE TABLE IF NOT EXISTS agenda (
	id INTEGER PRIMARY KEY,
	congregacao_id INTEGER NOT NULL REFERENCES congregacoes(id),
	ponto_id INTEGER REFERENCES pontos_pregacao(id) ON DELETE CASCADE,
	tipo_culto_id INTEGER NOT NULL REFERENCES tipos_culto(id),
	dia_semana INTEGER NOT NULL,
	semana_mes INTEGER,
	hora_inicio TEXT NOT NULL,
	hora_fim TEXT NOT NULL
);

-- Cada culto de um dia específico. Gerados a partir da agenda ou criados avulsos.
CREATE TABLE IF NOT EXISTS cultos (
	id INTEGER PRIMARY KEY,
	data TEXT NOT NULL,
	congregacao_id INTEGER NOT NULL REFERENCES congregacoes(id),
	ponto_id INTEGER REFERENCES pontos_pregacao(id) ON DELETE SET NULL,
	tipo_culto_id INTEGER NOT NULL REFERENCES tipos_culto(id),
	hora_inicio TEXT NOT NULL,
	hora_fim TEXT NOT NULL,
	agenda_id INTEGER REFERENCES agenda(id) ON DELETE SET NULL,
	tema TEXT NOT NULL DEFAULT '',
	observacao TEXT NOT NULL DEFAULT '',
	cancelado INTEGER NOT NULL DEFAULT 0,
	UNIQUE (agenda_id, data)
);
CREATE INDEX IF NOT EXISTS cultos_data ON cultos(data);

CREATE TABLE IF NOT EXISTS escalas (
	id INTEGER PRIMARY KEY,
	culto_id INTEGER NOT NULL REFERENCES cultos(id) ON DELETE CASCADE,
	usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
	autorizacao TEXT NOT NULL DEFAULT 'autorizada', -- aguardando (indicação do Pb) | autorizada
	funcao TEXT NOT NULL DEFAULT 'escalado',        -- escalado | titular (Pb na quarta) | auxiliar (encaminhado pelo Pb)
	resposta TEXT NOT NULL DEFAULT 'pendente',      -- pendente | confirmado | justificado
	justificativa TEXT,
	indicado_por INTEGER REFERENCES usuarios(id),
	autorizado_por INTEGER REFERENCES usuarios(id),
	criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
	UNIQUE (culto_id, usuario_id)
);

ALTER TABLE usuarios ADD COLUMN nascimento DATE;
ALTER TABLE usuarios ADD COLUMN gerencia_escala INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN credencial_versao INTEGER NOT NULL DEFAULT 0;
ALTER TABLE convites ADD COLUMN perfil TEXT NOT NULL DEFAULT 'obreiro';
ALTER TABLE convites ADD COLUMN usado_por INTEGER REFERENCES usuarios(id);
ALTER TABLE areas ADD COLUMN configurada INTEGER NOT NULL DEFAULT 0;
ALTER TABLE areas ADD COLUMN quantidade_prevista INTEGER NOT NULL DEFAULT 0;
ALTER TABLE congregacoes ADD COLUMN habilitada INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN area_id INTEGER REFERENCES areas(id);
ALTER TABLE convites ADD COLUMN tipo TEXT NOT NULL DEFAULT 'CHURCH_WORKER';
ALTER TABLE convites ADD COLUMN max_uses INTEGER NOT NULL DEFAULT 1;
ALTER TABLE convites ADD COLUMN current_uses INTEGER NOT NULL DEFAULT 0;
ALTER TABLE convites ADD COLUMN usado_em TEXT;
ALTER TABLE convites ADD COLUMN revogado_em TEXT;
ALTER TABLE tipos_culto ADD COLUMN codigo_cc TEXT NOT NULL DEFAULT '';
ALTER TABLE congregacoes ADD COLUMN polo TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS escala_migrations (nome TEXT PRIMARY KEY, aplicado_em TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS um_responsavel_ativo ON usuarios(congregacao_id) WHERE perfil='pb' AND status='ativo';
CREATE UNIQUE INDEX IF NOT EXISTS um_admin ON usuarios(perfil) WHERE perfil='admin';
CREATE UNIQUE INDEX IF NOT EXISTS um_coordenador_ativo ON usuarios(area_id) WHERE perfil='coordenador' AND status='ativo';
CREATE TABLE IF NOT EXISTS auditoria (
 id INTEGER PRIMARY KEY, actor INTEGER REFERENCES usuarios(id), action TEXT NOT NULL,
 entity TEXT NOT NULL, entity_id TEXT NOT NULL, quando TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS compromissos_oficiais (
 id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
 congregacao_id INTEGER NOT NULL REFERENCES congregacoes(id), inicio TEXT NOT NULL, fim TEXT NOT NULL,
 hora_inicio TEXT NOT NULL, hora_fim TEXT NOT NULL, descricao TEXT NOT NULL,
 criado_por INTEGER NOT NULL REFERENCES usuarios(id), cancelado INTEGER NOT NULL DEFAULT 0
);
CREATE TRIGGER IF NOT EXISTS usuario_area_insert BEFORE INSERT ON usuarios
 WHEN NEW.congregacao_id IS NOT NULL AND NEW.area_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM congregacoes WHERE id=NEW.congregacao_id AND area_id=NEW.area_id)
 BEGIN SELECT RAISE(ABORT, 'Congregacao fora da area'); END;
CREATE TRIGGER IF NOT EXISTS usuario_area_update BEFORE UPDATE OF congregacao_id,area_id ON usuarios
 WHEN NEW.congregacao_id IS NOT NULL AND NEW.area_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM congregacoes WHERE id=NEW.congregacao_id AND area_id=NEW.area_id)
 BEGIN SELECT RAISE(ABORT, 'Congregacao fora da area'); END;
INSERT OR IGNORE INTO escala_migrations(nome) VALUES ('005_v119');

CREATE TABLE IF NOT EXISTS tentativas_login (chave TEXT PRIMARY KEY, tentativas INTEGER NOT NULL DEFAULT 0, janela INTEGER NOT NULL);
CREATE TRIGGER IF NOT EXISTS limite_delegados_insert BEFORE INSERT ON usuarios
    WHEN NEW.gerencia_escala = 1 AND (SELECT COUNT(*) FROM usuarios u JOIN congregacoes g ON g.id=u.congregacao_id WHERE u.gerencia_escala=1 AND g.area_id=(SELECT area_id FROM congregacoes WHERE id=NEW.congregacao_id)) >= 2
    BEGIN SELECT RAISE(ABORT, 'Limite de dois responsáveis por escala na área.'); END;
    CREATE TRIGGER IF NOT EXISTS limite_delegados_update BEFORE UPDATE OF gerencia_escala, congregacao_id ON usuarios
    WHEN NEW.gerencia_escala = 1 AND (SELECT COUNT(*) FROM usuarios u JOIN congregacoes g ON g.id=u.congregacao_id WHERE u.gerencia_escala=1 AND u.id<>NEW.id AND g.area_id=(SELECT area_id FROM congregacoes WHERE id=NEW.congregacao_id)) >= 2
    BEGIN SELECT RAISE(ABORT, 'Limite de dois responsáveis por escala na área.'); END;
