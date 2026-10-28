import { todos, um, transacao, executar } from './db';
import { auditar } from './auditoria';
import { canWorkerBeAssigned, type Servico, type Trabalhador, type Ocupacao } from '#lib/elegibilidade';
export { canWorkerBeAssigned, type Servico, type Trabalhador, type Ocupacao } from '#lib/elegibilidade';
export const servicoPorId=(id:number)=>um<Servico>('SELECT c.*,t.nome AS tipo,g.area_id FROM cultos c JOIN tipos_culto t ON t.id=c.tipo_culto_id JOIN congregacoes g ON g.id=c.congregacao_id WHERE c.id=?',id);
export async function motivoInelegivel(usuarioId:number,c:Servico,previa:Ocupacao[]=[],ignorarEscala=0) {
 const u=await um<Trabalhador>('SELECT id,cargo,perfil,status,COALESCE(area_id,0) AS area_id,congregacao_id FROM usuarios WHERE id=?',usuarioId);
 if(!u) return 'Obreiro não encontrado.';
 const disp=await todos<{dia_semana:number;turno:string}>('SELECT dia_semana,turno FROM disponibilidades WHERE usuario_id=?',u.id);
 const excecao=!!await um('SELECT id FROM indisponibilidades WHERE usuario_id=? AND inicio<=? AND fim>=?',u.id,c.data,c.data);
 const conflito=!!await um('SELECT e.id FROM escalas e JOIN cultos c ON c.id=e.culto_id WHERE e.usuario_id=? AND c.cancelado=0 AND c.data=? AND c.hora_inicio<? AND c.hora_fim>? AND e.id<>?',u.id,c.data,c.hora_fim,c.hora_inicio,ignorarEscala)||previa.some(p=>p.usuario_id===u.id&&p.data===c.data&&p.hora_inicio<c.hora_fim&&p.hora_fim>c.hora_inicio);
 return canWorkerBeAssigned(u,c,disp.map(d=>`${d.dia_semana}-${d.turno}`),excecao,conflito);
}
// Serializa alterações por área também entre instâncias PostgreSQL.
export async function bloquearArea(areaId:number){await executar('UPDATE areas SET configurada=configurada WHERE id=?',areaId);}
export async function atribuir(c:Servico,usuarioId:number,actor:number,igrejaRestrita:number|null=null){
 return transacao(async()=>{
  await bloquearArea(c.area_id);
  const atual=await servicoPorId(c.id);
  if(!atual) return {erro:'Culto não encontrado.'};
  if(igrejaRestrita&&!await um('SELECT id FROM usuarios WHERE id=? AND congregacao_id=?',usuarioId,igrejaRestrita)) return {erro:'O obreiro pertence a outra congregação.'};
  const erro=await motivoInelegivel(usuarioId,atual);
  if(erro) return {erro};
  const r=await executar("INSERT INTO escalas(culto_id,usuario_id,autorizacao,indicado_por,autorizado_por) VALUES (?,?,'autorizada',?,?)",c.id,usuarioId,actor,actor);
  await auditar(actor,'escala_criada','escala',r.id);return {ok:'Obreiro escalado.',cultoId:c.id};
 });
}
