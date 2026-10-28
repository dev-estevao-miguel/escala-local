import assert from 'node:assert/strict';
import { configuracaoPostgres } from '../src/lib/server/postgres.ts';
import { ocultarSegredos } from '../src/lib/server/erros.ts';

const ambiente = { DATABASE_URL: 'postgresql://postgres:senha%40exemplo@db.exemplo.invalid:5432/postgres', NODE_ENV: 'production' };
const seguro = configuracaoPostgres(ambiente);
assert.equal(seguro.ssl.rejectUnauthorized, true);
for (const modo of ['require', 'verify-ca', 'verify-full']) {
	const r = configuracaoPostgres({ ...ambiente, DATABASE_URL: ambiente.DATABASE_URL + '?sslmode=' + modo, DATABASE_SSL_CA: 'CA\\nCERTIFICADO' });
	assert.equal(r.ssl.rejectUnauthorized, true);
	assert.equal(r.ssl.ca, 'CA\nCERTIFICADO');
	assert.equal(new URL(r.connectionString).searchParams.has('sslmode'), false);
}
for (const consulta of ['?sslmode=disable', '?sslmode=no-verify', '?sslmode=prefer', '?ssl=false']) {
	assert.throws(() => configuracaoPostgres({ ...ambiente, DATABASE_URL: ambiente.DATABASE_URL + consulta }), /exige TLS/);
}
for (const url of ['', 'invalida', 'https://db.invalid', 'postgresql://postgres:[YOUR-PASSWORD]@db.invalid/postgres', 'postgresql://postgres@db.invalid/postgres']) {
	assert.throws(() => configuracaoPostgres({ ...ambiente, DATABASE_URL: url }));
}
assert.equal(configuracaoPostgres({ DATABASE_URL: 'postgresql://localhost/teste' }).ssl, false);
assert.equal(configuracaoPostgres({ ...ambiente, DATABASE_URL: 'postgresql://postgres:senha@localhost/teste' }).ssl.rejectUnauthorized, true);
const segredos = { ...ambiente, ADMIN_SENHA: 'SenhaPrivada123!', SESSAO_SEGREDO: 'SegredoDeSessao12345678901234567890' };
const entrada = Object.values(segredos).join(' ') + ' senha@exemplo senha%40exemplo postgresql://outro:privado@banco.invalid/db';
const saida = ocultarSegredos(entrada, segredos);
for (const s of [segredos.DATABASE_URL, segredos.ADMIN_SENHA, segredos.SESSAO_SEGREDO, 'senha@exemplo', 'senha%40exemplo', 'outro:privado']) assert.ok(!saida.includes(s));
assert.equal(ocultarSegredos('Falha sem segredo', {}), 'Falha sem segredo');
assert.equal(ocultarSegredos('x'.repeat(10000), {}).length, 8192);
console.log('Segurança: TLS obrigatório, certificado validado, CA preservado e credenciais ocultadas nos erros.');
