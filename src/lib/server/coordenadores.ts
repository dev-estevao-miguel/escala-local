import { fail } from '@sveltejs/kit';
import { executar, transacao, um } from './db';
import { aderirArea } from './diretorio';
import { bloquearAdministracao } from './convites';
import { auditar } from './auditoria';
import type { Usuario } from '#lib/util';
export async function definirPrimeiraArea(u:Usuario,codigo:string){
 if(!/^\d{1,3}$/.test(codigo))return fail(400,{erro:'Informe um número de área válido.'});
 if(!['coordenador','vice'].includes(u.perfil))return fail(403,{erro:'Somente a coordenação pode configurar a primeira área.'});
 return transacao(async()=>{
  await bloquearAdministracao();
  const atual=await um<{area_id:number|null;pode_definir_area:number}>('SELECT area_id,pode_definir_area FROM usuarios WHERE id=?',u.id);
  if(!atual||atual.area_id||!atual.pode_definir_area)return fail(403,{erro:'A vinculação da sua área só pode ser alterada pelo Administrador.'});
  if(u.perfil==='coordenador'&&await um("SELECT u.id FROM usuarios u JOIN areas a ON a.id=u.area_id WHERE CAST(a.codigo AS INTEGER)=? AND u.perfil='coordenador' AND u.status='ativo'",Number(codigo)))return fail(409,{erro:'Esta área já possui coordenador. Procure o Administrador.'});
  let id:number;try{id=await aderirArea(codigo);}catch(e){return fail(400,{erro:e instanceof Error?e.message:'Área inválida.'});}
  await executar('UPDATE usuarios SET area_id=?,pode_definir_area=0 WHERE id=?',id,u.id);
  await auditar(u.id,'primeira_area_definida','area',id);return {ok:'Área vinculada. Suas congregações estão disponíveis.'};
 });
}
export async function moverCoordenador(actor:number,id:number,codigo:string){
 return transacao(async()=>{
  await bloquearAdministracao();
  const u=await um<{area_id:number|null;perfil:string}>("SELECT area_id,perfil FROM usuarios WHERE id=? AND perfil IN ('coordenador','vice') AND status<>'removido'",id);
  if(!u)return fail(404,{erro:'Coordenador não encontrado.'});
  let areaId:number|null=null;
  if(codigo){try{areaId=await aderirArea(codigo);}catch(e){return fail(400,{erro:e instanceof Error?e.message:'Área inválida.'});}}
  if(areaId&&u.perfil==='coordenador'){
   await executar("UPDATE convites SET revogado=1,revogado_em=CURRENT_TIMESTAMP WHERE criado_por IN (SELECT id FROM usuarios WHERE perfil='coordenador' AND area_id=? AND id<>?) AND area_id IS NOT NULL",areaId,id);
   await executar("UPDATE usuarios SET area_id=NULL,congregacao_id=NULL,pode_definir_area=0,gerencia_escala=0,credencial_versao=credencial_versao+1 WHERE perfil='coordenador' AND area_id=? AND id<>?",areaId,id);
  }
  await executar('UPDATE convites SET revogado=1,revogado_em=CURRENT_TIMESTAMP WHERE criado_por=? AND area_id IS NOT NULL',id);
  await executar('UPDATE usuarios SET area_id=?,congregacao_id=NULL,pode_definir_area=0,gerencia_escala=0,credencial_versao=credencial_versao+1 WHERE id=?',areaId,id);
  await auditar(actor,areaId?'coordenador_movido':'coordenador_desvinculado','usuario',id);
  return {ok:areaId?(u.perfil==='vice'?'Vice-Coordenador vinculado à área.':'Coordenador vinculado. O coordenador anterior, se houver, fica aguardando nova vinculação.'):'Vínculo removido. Os dados da área foram preservados.'};
 });
}
/** Mantém a referência usada pelo histórico, encerrando o cadastro e liberando a carteira. */
export async function excluirCoordenador(actor:number,id:number,carteira:string){
 return transacao(async()=>{
  await bloquearAdministracao();
  const u=await um<{carteira:string}>("SELECT carteira FROM usuarios WHERE id=? AND perfil IN ('coordenador','vice') AND status<>'removido'",id);
  if(!u)return fail(404,{erro:'Cadastro da coordenação não encontrado.'});
  if(carteira!==u.carteira)return fail(400,{erro:'Informe a carteira do cadastro para confirmar a exclusão.'});
  await executar('UPDATE convites SET revogado=1,revogado_em=CURRENT_TIMESTAMP WHERE criado_por=?',id);
  await executar("UPDATE usuarios SET status='removido',carteira=?,area_id=NULL,congregacao_id=NULL,pode_definir_area=0,gerencia_escala=0,whatsapp='',nascimento=NULL,foto_perfil=NULL,foto_versao=foto_versao+1,credencial_versao=credencial_versao+1 WHERE id=?",`removido-${id}`,id);
  await executar('DELETE FROM disponibilidades WHERE usuario_id=?',id);
  await auditar(actor,'coordenador_excluido','usuario',id);
  return {ok:'Cadastro excluído e acesso encerrado. A área e o histórico foram preservados.'};
 });
}
