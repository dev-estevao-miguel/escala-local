import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/env';
import { error } from '@sveltejs/kit';
import { ehAdminGeral, type Area, type Usuario } from '#lib/util';
import { executar, um } from './db';
export const COOKIE = 'sessao';
/** Área escolhida pelo administrador geral (os demais sempre trabalham na própria área). */
export const COOKIE_AREA = 'area';
const DURACAO_MS = 30 * 24 * 60 * 60 * 1000;
/**
 * Segredo que assina o cookie de sessão. Em produção vem da variável SESSAO_SEGREDO
 * (igual em todos os servidores); localmente é gerado uma vez e guardado no banco.
 */
async function segredo() {
    if ((process.env.VERCEL || process.env.NODE_ENV === 'production') && (!process.env.SESSAO_SEGREDO || process.env.SESSAO_SEGREDO.length < 32))
        throw new Error('Configure SESSAO_SEGREDO com pelo menos 32 caracteres.');
    if (process.env.SESSAO_SEGREDO)
        return process.env.SESSAO_SEGREDO;
    const salvo = (await um<{
        valor: string;
    }>(`SELECT valor FROM config WHERE chave = 'sessao_segredo'`));
    if (salvo)
        return salvo.valor;
    const novo = randomBytes(32).toString('hex');
    await executar(`INSERT INTO config (chave, valor) VALUES ('sessao_segredo', ?) ON CONFLICT (chave) DO NOTHING`, novo);
    return (await um<{valor:string}>(`SELECT valor FROM config WHERE chave = 'sessao_segredo'`))!.valor;
}
const assinar = async (conteudo: string) => createHmac('sha256', (await segredo())).update(conteudo).digest('base64url');
/** O cookie leva "usuario.expiracao.assinatura"; não depende de tabela de sessões no servidor. */
export async function criarSessao(cookies: Cookies, usuarioId: number) {
    const versao = (await um<{credencial_versao:number}>('SELECT credencial_versao FROM usuarios WHERE id = ?', usuarioId))!.credencial_versao;
    const conteudo = `${usuarioId}.${Date.now() + DURACAO_MS}.${versao}`;
    cookies.set(COOKIE, `${conteudo}.${(await assinar(conteudo))}`, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: !dev,
        maxAge: DURACAO_MS / 1000
    });
}
export async function usuarioDaSessao(token: string) {
    const [id, expira, versao, assinatura, extra] = token.split('.');
    if (!/^\d+$/.test(id ?? '') || !/^\d+$/.test(expira ?? '') || !/^\d+$/.test(versao ?? '') || !assinatura || extra || Number(expira) < Date.now())
        return null;
    const esperada = Buffer.from((await assinar(`${id}.${expira}.${versao}`)));
    const recebida = Buffer.from(assinatura);
    if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida))
        return null;
    // O status é conferido a cada acesso: quem for desativado perde o acesso na hora.
    return ((await um<Usuario>(`SELECT u.id, u.nome, u.carteira, u.cargo, u.perfil, COALESCE(u.congregacao_id,0) AS congregacao_id, COALESCE(g.nome,'') AS congregacao, COALESCE(u.area_id,g.area_id,0) AS area_id, u.trocar_senha, u.gerencia_escala,u.pode_definir_area,CASE WHEN u.foto_perfil IS NOT NULL THEN u.foto_versao ELSE 0 END AS foto_versao
			 FROM usuarios u LEFT JOIN congregacoes g ON g.id = u.congregacao_id
			 WHERE u.id = ? AND u.status = 'ativo' AND u.credencial_versao = ?`, Number(id), Number(versao))) ?? null);
}
/** Área em que o usuário está trabalhando agora. */
export async function areaAtual(u: Usuario, cookies: Cookies) {
    if(ehAdminGeral(u)||!u.area_id)return null;
    return (await um<Area>('SELECT id,codigo,polo FROM areas WHERE id=?',u.area_id))||null;
}
export function encerrarSessao(cookies: Cookies) {
    cookies.delete(COOKIE, { path: '/' });
}
/** Interrompe a requisição com 403 quando a condição de permissão não é atendida. */
export function exigir(condicao: boolean, mensagem = 'Acesso restrito à coordenação da área.') {
    if (!condicao)
        error(403, mensagem);
}
