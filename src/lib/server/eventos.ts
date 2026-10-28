import { fail } from '@sveltejs/kit';
import { exigir } from './auth';
import { executar,transacao,todos,um } from './db';
import { inteiro,texto,hora } from './form';
import { bloquearArea,motivoInelegivel,type Servico } from './elegibilidade';
import { auditar } from './auditoria';
import { dataValida,ehPb,type Usuario } from '#lib/util';
export async function salvarEvento(u:Usuario,f:FormData){
 exigir(ehPb(u)&&!!u.area_id&&!!u.congregacao_id,'Somente o responsável cadastra eventos da própria congregação.');
 if(f.has('congregacao_id')&&inteiro(f,'congregacao_id')!==u.congregacao_id)return fail(403,{erro:'Evento fora da sua congregação.'});
 const id=inteiro(f,'id'),nome=texto(f,'nome_evento'),data=texto(f,'data'),inicio=hora(f,'hora_inicio'),fim=hora(f,'hora_fim'),local=texto(f,'local_evento'),observacao=texto(f,'observacao');
 if(nome.length<3||nome.length>180||!dataValida(data)||!inicio||!fim||fim<=inicio||!local||local.length>240||observacao.length>1000)return fail(400,{erro:'Confira nome, data, horário, local e observação do evento.'});
 const tipo=inteiro(f,'tipo_culto_id')?await um<{id:number;nome:string}>('SELECT id,nome FROM tipos_culto WHERE id=? AND ativo=1',inteiro(f,'tipo_culto_id')):await um<{id:number;nome:string}>("SELECT id,nome FROM tipos_culto WHERE nome='Pregação' AND ativo=1");
 if(!tipo)return fail(400,{erro:'Selecione um tipo de culto válido.'});
 return transacao(async()=>{
  await bloquearArea(u.area_id);
  if(id){
   const anterior=await um<{congregacao_id:number;data:string;hora_inicio:string;hora_fim:string;tipo_culto_id:number}>('SELECT congregacao_id,data,hora_inicio,hora_fim,tipo_culto_id FROM cultos WHERE id=?',id);
   if(!anterior||anterior.congregacao_id!==u.congregacao_id)return fail(403,{erro:'Você só pode alterar eventos da sua congregação.'});
   if(anterior.data!==data||anterior.hora_inicio!==inicio||anterior.hora_fim!==fim||anterior.tipo_culto_id!==tipo.id){
    const participantes=await todos<{id:number;usuario_id:number}>('SELECT id,usuario_id FROM escalas WHERE culto_id=?',id);
    const servico:Servico={id,data,hora_inicio:inicio,hora_fim:fim,tipo:tipo.nome,area_id:u.area_id,congregacao_id:u.congregacao_id,cancelado:0};
    for(const p of participantes){const erro=await motivoInelegivel(p.usuario_id,servico,[],p.id);if(erro)return fail(409,{erro:`Revise a escala antes de alterar o evento: ${erro}`});}
   }
   await executar('UPDATE cultos SET nome_evento=?,data=?,hora_inicio=?,hora_fim=?,local_evento=?,tipo_culto_id=?,observacao=? WHERE id=?',nome,data,inicio,fim,local,tipo.id,observacao,id);
   await auditar(u.id,'evento_editado','culto',id);return {ok:'Evento atualizado.',id};
  }
  const r=await executar('INSERT INTO cultos(nome_evento,data,hora_inicio,hora_fim,local_evento,tipo_culto_id,congregacao_id,observacao) VALUES (?,?,?,?,?,?,?,?)',nome,data,inicio,fim,local,tipo.id,u.congregacao_id,observacao);
  await auditar(u.id,'evento_criado','culto',r.id);return {ok:'Evento cadastrado. A coordenação já pode gerar sua escala.',id:r.id};
 });
}
export async function excluirEvento(u:Usuario,id:number){
 exigir(ehPb(u),'Somente o responsável exclui eventos da própria igreja.');
 const alvo=await um<{congregacao_id:number}>('SELECT congregacao_id FROM cultos WHERE id=?',id);
 if(!alvo||alvo.congregacao_id!==u.congregacao_id)return fail(403,{erro:'Você só pode excluir eventos da sua congregação.'});
 await executar('UPDATE cultos SET cancelado=1 WHERE id=?',id);await auditar(u.id,'evento_excluido','culto',id);return {ok:'Evento excluído da programação. Histórico preservado.'};
}
