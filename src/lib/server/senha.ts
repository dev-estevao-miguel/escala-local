import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/** Cada redefinição recebe uma credencial temporária individual e imprevisível. */
export const gerarSenhaTemporaria = () => randomBytes(18).toString('base64url');

/**
 * Senha do Admin da plataforma: vem de ADMIN_SENHA (.env local e variável na Vercel).
 * Não é a senha padrão e não exige troca; depois de entrar ele pode alterá-la em "Meu cadastro".
 */
export function senhaDoAdmin() {
	const senha = process.env.ADMIN_PASSWORD || process.env.ADMIN_SENHA;
	if (!senha) throw new Error('Configure ADMIN_PASSWORD no .env (ou ADMIN_SENHA).');
	return senha;
}

export function hashSenha(senha: string) {
	const sal = randomBytes(16);
	return `${sal.toString('hex')}:${scryptSync(senha, sal, 64).toString('hex')}`;
}

export function conferirSenha(senha: string, armazenado: string) {
	const [sal, hash] = armazenado.split(':');
	if (!sal || !hash) return false;
	const calculado = scryptSync(senha, Buffer.from(sal, 'hex'), 64);
	const esperado = Buffer.from(hash, 'hex');
	return esperado.length === calculado.length && timingSafeEqual(calculado, esperado);
}
