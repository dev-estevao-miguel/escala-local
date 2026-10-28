import { error } from '@sveltejs/kit';
export const load=()=>error(403,'A vinculação de coordenadores é administrada em Gerenciar Coordenadores.');
export const actions={default:()=>error(403,'Você não pode trocar sua própria área.')};
