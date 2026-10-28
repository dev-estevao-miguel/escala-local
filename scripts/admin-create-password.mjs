import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import { configuracaoPostgres } from '../src/lib/server/postgres.ts';
import { CHAVE_CONFIGURACAO_ADMIN, gerarConfiguracaoAdmin } from '../src/lib/server/admin-configuracao-dados.ts';

for (const arquivo of ['.env.local', '.env']) if (existsSync(arquivo)) process.loadEnvFile(arquivo);
const posicao = process.argv.indexOf('--origem');
const origem = new URL(process.argv[posicao + 1] || 'http://localhost:5173');
if ((posicao < 0) || (origem.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(origem.hostname))) throw new Error('Informe --origem com o endereço HTTPS da plataforma ou localhost.');
const pasta = resolve('.codex-backup', 'admin-senha-' + new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(pasta, { recursive: true });
let link, expiraEm;
async function preparar(ler, gravar) {
	const usuario = await ler("SELECT * FROM usuarios WHERE carteira='900001' AND perfil='admin' AND status='ativo'");
	if (!usuario) throw new Error('Administrador ativo 900001 não encontrado.');
	const anterior = await ler('SELECT valor FROM config WHERE chave=$1', [CHAVE_CONFIGURACAO_ADMIN]);
	writeFileSync(join(pasta, 'anterior.json'), JSON.stringify({ usuario, configuracaoAnterior: anterior ?? null }, null, 2));
	const { token, registro } = gerarConfiguracaoAdmin(Number(usuario.id), Number(usuario.credencial_versao));
	await gravar('INSERT INTO config(chave,valor) VALUES ($1,$2) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor', [CHAVE_CONFIGURACAO_ADMIN, JSON.stringify(registro)]);
	link = origem.origin + '/acesso-admin/' + token;
	expiraEm = new Date(registro.expiraEm).toISOString();
}
if (process.env.DATABASE_URL) {
	const pool = new pg.Pool({ ...configuracaoPostgres(), max: 1, connectionTimeoutMillis: 10000 });
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		await client.query('SELECT pg_advisory_xact_lock(26123302,0)');
		await preparar(async (q,p) => (await client.query(q,p)).rows[0], (q,p) => client.query(q,p));
		await client.query('COMMIT');
	} catch (e) { await client.query('ROLLBACK'); throw e; }
	finally { client.release(); await pool.end(); }
} else {
	const db = new DatabaseSync(join(process.env.DATA_DIR || 'data', 'demo-local-v1.19.db'));
	try {
		db.exec('BEGIN IMMEDIATE');
		const sql = q => q.replace(/\$\d/g, '?');
		await preparar(async(q,p=[]) => db.prepare(sql(q)).get(...p), async(q,p=[]) => db.prepare(sql(q)).run(...p));
		db.exec('COMMIT');
	} catch (e) { db.exec('ROLLBACK'); throw e; }
	finally { db.close(); }
}
writeFileSync(join(pasta, 'link-privado.json'), JSON.stringify({ link, expiraEm }, null, 2));
console.log(JSON.stringify({ linkPrivadoSalvoEm: join(pasta, 'link-privado.json'), expiraEm, carteira: '900001', senhaAtualPreservada: true }));
