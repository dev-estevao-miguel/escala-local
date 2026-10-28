import { dev } from '$app/env';
import { error, redirect } from '@sveltejs/kit';
import { encerrarSessao } from '#lib/server/auth';
import { configuracaoAdminAtiva } from '#lib/server/admin-configuracao';
import { COOKIE_CONFIGURACAO_ADMIN } from '#lib/server/admin-configuracao-dados';

export const GET = async ({ params, cookies, setHeaders }) => {
	setHeaders({'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'});
	if (!await configuracaoAdminAtiva(params.token)) error(410, 'Este link privado expirou ou já foi utilizado.');
	encerrarSessao(cookies);
	cookies.set(COOKIE_CONFIGURACAO_ADMIN, params.token, { path: '/login', httpOnly: true, secure: !dev, sameSite: 'strict', maxAge: 24 * 60 * 60 });
	redirect(303, '/login');
};
