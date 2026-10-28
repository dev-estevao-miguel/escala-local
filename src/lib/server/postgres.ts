import type { PoolConfig } from 'pg';

/** TLS com certificado validado, inclusive nas ferramentas de migração. */
export function configuracaoPostgres(ambiente: NodeJS.ProcessEnv = process.env): PoolConfig {
	let url: URL;
	try { url = new URL(ambiente.DATABASE_URL ?? ''); }
	catch { throw new Error('Configure DATABASE_URL com a conexão completa do Supabase.'); }
	if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || /\[|\]|YOUR-PASSWORD/i.test(decodeURIComponent(url.password))) {
		throw new Error('DATABASE_URL inválida ou ainda com senha de exemplo.');
	}
	const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && ambiente.NODE_ENV !== 'production' && !ambiente.VERCEL;
	if (!local && !url.password) throw new Error('Preencha a senha da conexão em DATABASE_URL.');
	// A URI não pode sobrescrever a validação TLS ou o CA passado abaixo.
	const modo = url.searchParams.get('sslmode');
	if ((modo && !['require', 'verify-ca', 'verify-full'].includes(modo)) || url.searchParams.has('ssl')) {
		throw new Error('A conexão remota exige TLS com validação do certificado. Use sslmode=verify-full.');
	}
	for (const campo of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat']) url.searchParams.delete(campo);
	const ca = ambiente.DATABASE_SSL_CA?.replace(/\\n/g, '\n');
	return {
		connectionString: url.toString(),
		ssl: local && !modo && !ca ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) }
	};
}
