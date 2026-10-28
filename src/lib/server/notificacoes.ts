import {fail} from '@sveltejs/kit';
import {executar,todos,um,transacao} from './db';
import {bloquearArea} from './elegibilidade';
import {auditar} from './auditoria';
import {ehAdmin,podeMontarEscala,formatarData,type Usuario} from '#lib/util';
export interface PublicacaoEscala{id:number;inicio:string;fim:string;quantidade:number;publicado_por:number|null;notificado_em:string|null;destinatarios:number}
export async function publicacoesRecentes(u:Usuario){
 return todos<PublicacaoEscala>('SELECT id,inicio,fim,quantidade,publicado_por,notificado_em,destinatarios FROM publicacoes_escala WHERE area_id=? AND (?=1 OR publicado_por=?) ORDER BY id DESC LIMIT 10',u.area_id,ehAdmin(u)?1:0,u.id);
}
export async function contarNaoLidas(usuarioId:number,areaId:number){
 return (await um<{n:number}>('SELECT COUNT(*) AS n FROM notificacoes n JOIN publicacoes_escala p ON p.id=n.publicacao_id WHERE n.usuario_id=? AND p.area_id=? AND n.lida_em IS NULL',usuarioId,areaId))!.n;
}
export async function notificarPublicacao(u:Usuario,id:number){
 if(!podeMontarEscala(u,u.area_id))return fail(403,{erro:'Você não pode notificar esta escala.'});
 return transacao(async()=>{
  await bloquearArea(u.area_id);
  const p=await um<PublicacaoEscala>('SELECT id,inicio,fim,quantidade,publicado_por,notificado_em,destinatarios FROM publicacoes_escala WHERE id=? AND area_id=?',id,u.area_id);
  if(!p||(!ehAdmin(u)&&p.publicado_por!==u.id))return fail(403,{erro:'Publicação fora da sua permissão.'});
  if(p.notificado_em)return {ok:`Esta escala já foi notificada a ${p.destinatarios} obreiro(s).`,publicacaoId:id,enviadas:p.destinatarios,repetido:true};
  if(!await um("SELECT e.id FROM escalas e JOIN cultos c ON c.id=e.culto_id WHERE e.publicacao_id=? AND e.autorizacao='autorizada' AND c.cancelado=0 LIMIT 1",id))return fail(409,{erro:'Esta publicação não possui escalas ativas para notificar.'});
  const mensagem=`A escala da Área está disponível para o período de ${formatarData(p.inicio)} a ${formatarData(p.fim)}. Confira os cultos, horários e obreiros escalados.`;
  const r=await executar(`INSERT INTO notificacoes(usuario_id,publicacao_id,titulo,mensagem,link)
   SELECT u.id,?,?,?,? FROM usuarios u WHERE u.area_id=? AND u.status='ativo' AND u.perfil<>'admin'
   ON CONFLICT(publicacao_id,usuario_id) DO NOTHING`,id,'Nova escala publicada',mensagem,'/escala?data='+p.inicio,u.area_id);
  await executar("UPDATE publicacoes_escala SET notificado_em=datetime('now','localtime'),notificado_por=?,destinatarios=? WHERE id=?",u.id,r.alteradas,id);
  await auditar(u.id,'escala_notificada','publicacao',id);
  return {ok:`Notificação enviada a ${r.alteradas} obreiro(s) da área.`,publicacaoId:id,enviadas:r.alteradas,repetido:false};
 });
}
