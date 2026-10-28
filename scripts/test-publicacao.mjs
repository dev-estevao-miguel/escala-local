import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { setTimeout as pausa } from 'node:timers/promises';
import { chromium } from '@playwright/test';

if (!existsSync('build/index.js')) throw new Error('Execute npm run build com o adaptador Node antes deste teste.');
const segredos = ['.env', '.env.local'].filter(existsSync).flatMap(f => Object.entries(parseEnv(readFileSync(f, 'utf8')))
	.filter(([k, v]) => /SENHA|PASSWORD|SEGREDO|DATABASE_URL|SERVICE_ROLE|TOKEN/.test(k) && v.length >= 10).map(([, v]) => v));
const variantes = segredos.flatMap(v => [v, JSON.stringify(v).slice(1, -1), encodeURIComponent(v)]);
let arquivos = 0;
function conferir(pasta) {
	for (const nome of readdirSync(pasta)) {
		const caminho = join(pasta, nome);
		if (statSync(caminho).isDirectory()) { conferir(caminho); continue; }
		assert.ok(!/\.env|\.(?:db|sqlite|csv|pem|key|map)$/.test(nome), 'Arquivo privado ou mapa no conteúdo público: ' + caminho);
		const texto = readFileSync(caminho, 'utf8');
		assert.ok(!variantes.some(v => texto.includes(v)), 'Possível segredo no conteúdo público: ' + caminho);
		assert.ok(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(texto), 'Chave privada no conteúdo público');
		arquivos++;
	}
}
conferir('build/client');

// Teste das rotas públicas e barreiras da compilação real. Não acessa Supabase
// nem autentica usuários: o destino de banco intencionalmente não existe.
const origem = 'http://127.0.0.1:5175';
const servidor = spawn(process.execPath, ['build'], {
	env: { ...process.env, NODE_ENV: 'production', VERCEL: '', PORT: '5175', HOST: '127.0.0.1', ORIGIN: origem,
		DATABASE_URL: 'postgresql://teste:nao-usar@127.0.0.1:1/sem-banco', SESSAO_SEGREDO: 'segredo-exclusivo-do-teste-publicacao-1234567890' },
	stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '', browser;
servidor.stdout.on('data', b => logs += b.toString());
servidor.stderr.on('data', b => logs += b.toString());
try {
	let pronto = false;
	for (let i = 0; i < 100; i++) {
		if (servidor.exitCode !== null) throw new Error('Servidor de teste encerrou: ' + logs);
		try { pronto = (await fetch(origem + '/login')).status === 200; } catch { /* Aguarda o servidor local. */ }
		if (pronto) break;
		await pausa(100);
	}
	assert.ok(pronto, 'Servidor de teste não iniciou');
	browser = await chromium.launch({ channel: 'chrome', headless: true });
	const contexto = await browser.newContext(), page = await contexto.newPage();
	const erros = [];
	page.on('pageerror', e => erros.push(e.message));
	await page.addInitScript(() => {
		window.__violacoesCsp = [];
		document.addEventListener('securitypolicyviolation', e => window.__violacoesCsp.push(e.effectiveDirective));
	});
	const resposta = await page.goto(origem + '/login');
	await page.waitForLoadState('networkidle');
	assert.equal(resposta.status(), 200);
	assert.equal(resposta.headers()['referrer-policy'], 'same-origin');
	assert.ok(await page.getByRole('heading', { name: 'Acesse sua conta', exact: true }).isVisible());
	const csp = resposta.headers()['content-security-policy'];
	assert.match(csp, /script-src 'self' 'nonce-[^']+'/);
	assert.ok(!csp.includes('ws:') && !csp.includes('unsafe-eval'));
	assert.deepEqual(erros, []);
	assert.deepEqual(await page.evaluate(() => window.__violacoesCsp), []);
	await page.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__scriptIndevido = true'; document.body.append(s); });
	await page.waitForFunction(() => window.__violacoesCsp.includes('script-src-elem'));
	assert.equal(await page.evaluate(() => window.__scriptIndevido), undefined);
	const csrf = await fetch(origem + '/login', { method: 'POST', headers: { Origin: 'https://origem-maliciosa.invalid' }, body: new URLSearchParams({ carteira: '900001', senha: 'NaoExecutarLogin' }), redirect: 'manual' });
	assert.equal(csrf.status, 403);
	assert.equal(csrf.headers.get('set-cookie'), null);
	for (const caminho of ['/', '/perfil', '/escala/pdf', '/coordenadores', '/.env', '/data/demo-local-v1.19.db', '/.codex-backup/']) {
		const r = await fetch(origem + caminho, { redirect: 'manual' });
		assert.ok([303, 404].includes(r.status), 'Rota privada acessível: ' + caminho);
	}
	console.log(`Compilação de produção: ${arquivos} arquivos públicos sem segredos locais ou mapas; login renderiza sem erros; CSP bloqueia script injetado; CSRF bloqueia origem externa; páginas e arquivos privados protegidos. Supabase não acessado.`);
} finally {
	await browser?.close();
	servidor.kill();
}
