import { error } from '@sveltejs/kit';
export const load = () => error(403,'O cadastro está disponível somente por convite.');
export const actions = {default:()=>error(403,'Solicite um convite à coordenação.')};
