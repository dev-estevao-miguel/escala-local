import { um } from '#lib/server/db';
import { criarSessao } from '#lib/server/auth';
import { buscarConvite, estadoConvite, cargosConvite, registrarPorConvite } from '#lib/server/convites';
import { listarCongregacoes } from '#lib/server/obreiros';
import { limitar } from '#lib/server/limite';
import { fail, redirect } from '@sveltejs/kit';
export const load=async({params})=>{
  const c=await buscarConvite(params.token);
  return {motivo:(await estadoConvite(params.token)).erro,cargosPermitidos:cargosConvite(c?.perfil??'obreiro'),valido:!!c,congregacaoFixa:c?.congregacao_id??null,convidadoPor:c?.criado_por_nome??'',convidadoFuncao:c?({admin:'Administrador',coordenador:'Coordenador',vice:'Vice-Coordenador',pb:'Responsável pela congregação',obreiro:'Obreiro'}[c.criado_por_perfil]):'',perfilConvite:c?.perfil??'obreiro',acessoImediato:!!c,area:c?.area_id?{codigo:c.area,polo:c.polo}:null,congregacoes:c?.area_id?await listarCongregacoes(c.area_id):[]};
};
export const actions={
  continuar:async({request,params,getClientAddress})=>{
    if(await limitar('identificar-convite:'+getClientAddress(),40,15))return fail(429,{erro:'Muitas tentativas. Aguarde alguns minutos.'});
    const c=await buscarConvite(params.token);
    if(!c)return fail(410,{erro:'Este convite não está mais disponível.'});
    const f=await request.formData(),carteira=String(f.get('carteira')??'').trim();
    if(!/^\d{4,20}$/.test(carteira))return fail(400,{erro:'Informe uma carteira válida.'});
    const existente=!!await um('SELECT id FROM usuarios WHERE carteira=?',carteira);
    return {etapa:'perfil',carteira,existente};
  },
  salvar:async({request,params,cookies,getClientAddress,locals})=>{
  if(await limitar('convite:'+getClientAddress(),25,60)) return fail(429,{erro:'Muitas tentativas. Tente mais tarde.',valores:undefined});
  try {
    const resultado=await registrarPorConvite(params.token,await request.formData(),locals.user);
    if('concluido' in resultado && resultado.imediato){await criarSessao(cookies,resultado.id);redirect(303,'/');}
    return resultado;
  } catch(e){
    if((e as {code?:string}).code==='23505'||String(e).includes('UNIQUE constraint'))return fail(409,{erro:'Esta carteira já possui cadastro.',valores:undefined});
    throw e;
  }
}};
