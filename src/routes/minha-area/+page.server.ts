import { exigir } from '#lib/server/auth';
import { todos } from '#lib/server/db';
import { conviteAtivo,emitirConvite } from '#lib/server/convites';
import { podeGerirArea } from '#lib/util';
export const load=async({locals})=>{
 exigir(!!locals.area&&podeGerirArea(locals.user,locals.area.id));
 return {convite:await conviteAtivo('pb',locals.area!.id),igrejas:await todos<{id:number;nome:string;polo:string;responsavel:string|null;cargo:string|null;status:string|null}>("SELECT g.id,g.nome,g.polo,u.nome AS responsavel,u.cargo,u.status FROM congregacoes g LEFT JOIN usuarios u ON u.id=(SELECT r.id FROM usuarios r WHERE r.congregacao_id=g.id AND r.perfil='pb' AND r.status<>'removido' ORDER BY CASE WHEN r.status='ativo' THEN 0 ELSE 1 END,r.id DESC LIMIT 1) WHERE g.area_id=? AND g.habilitada=1 ORDER BY g.nome",locals.area!.id)};
};
export const actions={convidar:async({locals,request})=>{exigir(!!locals.area&&podeGerirArea(locals.user,locals.area.id));const f=await request.formData();f.set('perfil','pb');return emitirConvite(locals.user!,locals.area!.id,f);}};
