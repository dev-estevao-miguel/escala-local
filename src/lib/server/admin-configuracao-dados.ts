import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const CHAVE_CONFIGURACAO_ADMIN = 'admin_configuracao_senha';
export const COOKIE_CONFIGURACAO_ADMIN = 'configurar_admin';
export const VALIDADE_CONFIGURACAO_ADMIN = 24 * 60 * 60 * 1000;
export interface ConfiguracaoAdmin { usuarioId: number; versao: number; hash: string; expiraEm: number }

export function gerarConfiguracaoAdmin(usuarioId: number, versao: number) {
	const token = randomBytes(32).toString('base64url');
	const registro: ConfiguracaoAdmin = { usuarioId, versao, hash: createHash('sha256').update(token).digest('hex'), expiraEm: Date.now() + VALIDADE_CONFIGURACAO_ADMIN };
	return { token, registro };
}

export function validarConfiguracaoAdmin(valor: string, token: string): ConfiguracaoAdmin | null {
	if (!/^[\w-]{43}$/.test(token)) return null;
	try {
		const r = JSON.parse(valor) as ConfiguracaoAdmin;
		if (!Number.isSafeInteger(r.usuarioId) || r.usuarioId < 1 || !Number.isSafeInteger(r.versao) || r.versao < 0 || !Number.isFinite(r.expiraEm) || r.expiraEm <= Date.now() || !/^[a-f0-9]{64}$/.test(r.hash)) return null;
		return timingSafeEqual(Buffer.from(r.hash, 'hex'), createHash('sha256').update(token).digest()) ? r : null;
	} catch { return null; }
}
