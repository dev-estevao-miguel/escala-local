import {exigir} from '#lib/server/auth';
import {todos,um,executar} from '#lib/server/db';
import {inteiro} from '#lib/server/form';
import {fail,redirect} from '@sveltejs/kit';
export const load=async({locals})=>{
 exigir(!!locals.user&&!!locals.area);
 return {avisos:await todos<{id:number;titulo:string;mensagem:string;link:string;criado_em:string;lida_em:string|null}>(
  'SELECT n.id,n.titulo,n.mensagem,n.link,n.criado_em,n.lida_em FROM notificacoes n JOIN publicacoes_escala p ON p.id=n.publicacao_id WHERE n.usuario_id=? AND p.area_id=? ORDER BY n.id DESC LIMIT 50',locals.user!.id,locals.area!.id)};
};
async function ler(usuarioId:number,areaId:number,id:number){
 return executar("UPDATE notificacoes SET lida_em=COALESCE(lida_em,datetime('now','localtime')) WHERE id=? AND usuario_id=? AND publicacao_id IN (SELECT id FROM publicacoes_escala WHERE area_id=?)",id,usuarioId,areaId);
}
export const actions={
 ler:async({locals,request})=>{
  exigir(!!locals.user&&!!locals.area);const r=await ler(locals.user!.id,locals.area!.id,inteiro(await request.formData(),'id'));
  return r.alteradas?{ok:'Notificação marcada como lida.'}:fail(404,{erro:'Notificação não encontrada.'});
 },
 lerTodas:async({locals})=>{
  exigir(!!locals.user&&!!locals.area);
  await executar("UPDATE notificacoes SET lida_em=datetime('now','localtime') WHERE usuario_id=? AND lida_em IS NULL AND publicacao_id IN (SELECT id FROM publicacoes_escala WHERE area_id=?)",locals.user!.id,locals.area!.id);
  return {ok:'Todas as notificações foram marcadas como lidas.'};
 },
 abrir:async({locals,request})=>{
  exigir(!!locals.user&&!!locals.area);const id=inteiro(await request.formData(),'id');
  const n=await um<{link:string}>('SELECT n.link FROM notificacoes n JOIN publicacoes_escala p ON p.id=n.publicacao_id WHERE n.id=? AND n.usuario_id=? AND p.area_id=?',id,locals.user!.id,locals.area!.id);
  if(!n)return fail(404,{erro:'Notificação não encontrada.'});
  await ler(locals.user!.id,locals.area!.id,id);redirect(303,n.link);
 }
};
