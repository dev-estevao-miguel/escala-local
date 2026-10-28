import {json} from '@sveltejs/kit';
import {exigir} from '#lib/server/auth';
import {contarNaoLidas} from '#lib/server/notificacoes';
export const GET=async({locals})=>{
 exigir(!!locals.user&&!!locals.area);
 return json({naoLidas:await contarNaoLidas(locals.user!.id,locals.area!.id)},{headers:{'Cache-Control':'private, no-store'}});
};
