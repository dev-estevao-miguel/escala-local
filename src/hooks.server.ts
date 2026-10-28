import { redirect, error } from '@sveltejs/kit';
import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { COOKIE, areaAtual, usuarioDaSessao } from '#lib/server/auth';
import { ehAdminGeral } from '#lib/util';
import { executar } from '#lib/server/db';
import { ocultarSegredos } from '#lib/server/erros';


const ROTAS_PUBLICAS = ['/login', '/cadastro', '/convite', '/primeiro-acesso', '/acesso-admin'];
export const handle: Handle = async ({ event, resolve }) => {

    const token = event.cookies.get(COOKIE);
    event.locals.user = token ? (await usuarioDaSessao(token)) : null;
    event.locals.area = event.locals.user ? (await areaAtual(event.locals.user, event.cookies)) : null;
    const caminho = event.url.pathname;
    const publica = ROTAS_PUBLICAS.some((r) => caminho === r || caminho.startsWith(`${r}/`));
    if (!event.locals.user && !publica)
        redirect(303, '/login');
    if (event.locals.user && caminho === '/login')
        redirect(303, '/');
    // Quem entrou com uma senha temporária precisa criar sua senha pessoal.
    const trocar = !!event.locals.user?.trocar_senha;
    if (trocar && caminho !== '/trocar-senha' && caminho !== '/sair')
        redirect(303, '/trocar-senha');
    if (event.locals.user && !trocar && caminho === '/trocar-senha')
        redirect(303, '/');
    // Último acesso (no máximo uma gravação a cada 15 minutos por pessoa), para o painel da plataforma.
    if (event.locals.user) {
        (await executar(`UPDATE usuarios SET ultimo_acesso = datetime('now', 'localtime')
			 WHERE id = ? AND (ultimo_acesso IS NULL OR ultimo_acesso < datetime('now', 'localtime', '-15 minutes'))`, event.locals.user.id));
    }
    if(event.locals.user&&!publica){
        const conta=['/','/perfil','/perfil/foto','/perfil/identificacao/pdf','/sair','/trocar-senha'].includes(caminho);
        if(ehAdminGeral(event.locals.user)&&!conta&&!['/coordenadores','/plataforma'].includes(caminho)) throw error(403,'O Administrador não participa da operação das áreas.');
        if(!ehAdminGeral(event.locals.user)&&!event.locals.area&&!conta) redirect(303,'/');
    }
    const resposta = await resolve(event);
    resposta.headers.set('Cache-Control', 'private, no-store');
    resposta.headers.set('X-Content-Type-Options', 'nosniff');
    // Preserva a origem nos formulários nativos, inclusive antes da hidratação,
    // sem enviar o endereço das páginas para outros sites.
    resposta.headers.set('Referrer-Policy', 'same-origin');
    resposta.headers.set('X-Frame-Options', 'DENY');
    resposta.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    resposta.headers.set('X-Robots-Tag', 'noindex, nofollow');
    if (event.url.protocol === 'https:') resposta.headers.set('Strict-Transport-Security', 'max-age=31536000');
    return resposta;
};
/** Falhas inesperadas ficam registradas para o Admin da plataforma corrigir. */
export const handleError: HandleServerError = async ({ kind, error, event }) => {
    // Páginas inexistentes e acessos negados (kind 'framework' / 'app') são esperados: não entram no registro.
    if (kind !== 'unknown')
        return;
    const mensagem = ocultarSegredos(error instanceof Error ? error.message : String(error));
    const detalhe = ocultarSegredos(error instanceof Error ? (error.stack ?? '') : '');
    console.error('[falha]', detalhe || mensagem);
    try {
        (await executar('INSERT INTO erros (metodo, rota, status, mensagem, detalhe, usuario_id) VALUES (?, ?, ?, ?, ?, ?)', event.request.method, event.url.pathname.replace(/(cadastro|convite|acesso-admin)\/.+/, '$1/[oculto]'), 500, mensagem, detalhe, event.locals.user?.id ?? null));
    }
    catch (e) {
        console.error('[erros] Não foi possível registrar a falha:', ocultarSegredos(String(e)));
    }
    return { message: 'Não foi possível concluir esta operação. Tente novamente em alguns instantes.' };
};
