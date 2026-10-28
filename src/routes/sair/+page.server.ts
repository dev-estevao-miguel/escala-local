import { redirect } from '@sveltejs/kit';
import { encerrarSessao } from '#lib/server/auth';
export const load = () => redirect(303, '/');
export const actions = {
    default: ({ cookies }) => {
        encerrarSessao(cookies);
        redirect(303, '/login');
    }
};
