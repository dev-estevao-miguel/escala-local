import { fail } from '@sveltejs/kit';
import { exigir } from '#lib/server/auth';
import { executar, transacao } from '#lib/server/db';
import { gerarPrevia, assinaturaPrevia, conferirPrevia } from '#lib/server/gerador';
import { bloquearArea } from '#lib/server/elegibilidade';
import { auditar } from '#lib/server/auditoria';
import {publicacoesRecentes,notificarPublicacao} from '#lib/server/notificacoes';
import {inteiro} from '#lib/server/form';
import { dataValida, hojeISO, somarDias, podeMontarEscala, ehPb, igrejaRestrita } from '#lib/util';
export const load=async({locals})=>{exigir(podeMontarEscala(locals.user,locals.area!.id));return {inicio:hojeISO(),fim:somarDias(hojeISO(),6),publicacoes:await publicacoesRecentes(locals.user!)};};
function datas(f:FormData){const inicio=String(f.get('inicio')),fim=String(f.get('fim'));return dataValida(inicio)&&dataValida(fim)&&fim>=inicio&&fim<=somarDias(inicio,31)?{inicio,fim}:null;}
export const actions={
 previa:async({locals,request})=>{
  exigir(podeMontarEscala(locals.user,locals.area!.id));const d=datas(await request.formData());
  if(!d)return fail(400,{erro:'Escolha um período de até 31 dias.'});
  const previa=await gerarPrevia(locals.area!.id,d.inicio,d.fim,locals.user!.gerencia_escala?null:igrejaRestrita(locals.user));
  return {...d,previa,assinatura:assinaturaPrevia(locals.user!.id,d.inicio,d.fim,previa)};
 },
 confirmar:async({locals,request})=>{
  const u=locals.user!,area=locals.area!;exigir(podeMontarEscala(u,area.id));
  const f=await request.formData(),d=datas(f);if(!d)return fail(400,{erro:'Período inválido.'});
  return transacao(async()=>{
   await bloquearArea(area.id);
   const previa=await gerarPrevia(area.id,d.inicio,d.fim,u.gerencia_escala?null:igrejaRestrita(u));
   if(!conferirPrevia(String(f.get('assinatura')),assinaturaPrevia(u.id,d.inicio,d.fim,previa))) return fail(409,{erro:'Os dados mudaram ou a prévia é inválida. Gere uma nova prévia.'});
   if(!previa.propostas.length)return fail(400,{erro:'Não há novas escalas para publicar neste período.'});
   const publicacao=await executar('INSERT INTO publicacoes_escala(area_id,publicado_por,inicio,fim,quantidade) VALUES(?,?,?,?,?)',area.id,u.id,d.inicio,d.fim,previa.propostas.length);
   for(const p of previa.propostas){const r=await executar("INSERT INTO escalas(culto_id,usuario_id,autorizacao,indicado_por,autorizado_por,publicacao_id) VALUES (?,?,'autorizada',?,?,?)",p.culto_id,p.usuario_id,u.id,u.id,publicacao.id);await auditar(u.id,'escala_criada','escala',r.id);}
   await auditar(u.id,'escala_automatica_gerada','area',area.id);return {ok:`${previa.propostas.length} escala(s) publicada(s). Agora você pode notificar os obreiros da área.`,publicacaoId:publicacao.id};
  });
 },
 notificar:async({locals,request})=>notificarPublicacao(locals.user!,inteiro(await request.formData(),'publicacao_id'))
};
