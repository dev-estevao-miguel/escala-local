import { redirect, error } from '@sveltejs/kit';
export const load = () => redirect(303,'/obreiros');
export const actions = {default:()=>error(403,'Novos cadastros exigem convite.')};
