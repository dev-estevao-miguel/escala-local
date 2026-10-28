import { fail, redirect } from '@sveltejs/kit';
import { criarSessao } from '#lib/server/auth';
import { um } from '#lib/server/db';
import { texto } from '#lib/server/form';
import { conferirSenha, hashSenha } from '#lib/server/senha';
import { limitar } from '#lib/server/limite';
import { cadastrarSenhaAdmin, configuracaoAdminAtiva } from '#lib/server/admin-configuracao';
import { COOKIE_CONFIGURACAO_ADMIN } from '#lib/server/admin-configuracao-dados';

const FALSA=hashSenha('conta-inexistente');
const MENSAGENS:Record<string,string>={pendente:'Seu cadastro aguarda autorização da coordenação da área.',recusado:'Cadastro não aprovado. Procure a coordenação.',removido:'Cadastro removido. Procure a coordenação.',inativo:'Acesso desativado. Procure a coordenação.'};
export const actions={
  default:async({request,cookies,getClientAddress})=>{
    const f=await request.formData();
    const carteira=texto(f,'carteira').replace(/\s+/g,'');
    const senha=String(f.get('senha')??'');
    if (!/^\d{4,20}$/.test(carteira)) return fail(400,{carteira,erro:'Informe o número da carteira de membro.',etapa:'carteira'});
    if(await limitar('login:'+getClientAddress(),60) || await limitar('carteira:'+carteira,15)) return fail(429,{carteira,erro:'Muitas tentativas. Aguarde 15 minutos.',etapa:senha?'senha':'carteira'});
    const tokenAdmin = cookies.get(COOKIE_CONFIGURACAO_ADMIN) ?? '';
    if (f.get('cadastrar_admin') === '1') {
      if (carteira !== '900001') return fail(403,{carteira,erro:'Este acesso é exclusivo do administrador 900001.',etapa:'carteira'});
      const resultado = await cadastrarSenhaAdmin(tokenAdmin, String(f.get('nova') ?? ''), String(f.get('nova2') ?? ''));
      if ('erro' in resultado) {
        if (resultado.status === 410) cookies.delete(COOKIE_CONFIGURACAO_ADMIN, {path:'/login'});
        return fail(resultado.status,{carteira,erro:resultado.erro,etapa:resultado.status===400?'cadastrar-admin':'carteira'});
      }
      cookies.delete(COOKIE_CONFIGURACAO_ADMIN, {path:'/login'});
      await criarSessao(cookies, resultado.usuarioId);
      redirect(303,'/');
    }
    if (carteira === '900001' && !senha && await configuracaoAdminAtiva(tokenAdmin)) return {carteira,etapa:'cadastrar-admin'};
    const usuario=await um<{id:number;senha_hash:string;status:string;trocar_senha:number}>('SELECT id,senha_hash,status,trocar_senha FROM usuarios WHERE carteira=?',carteira);
    if(!senha){
      if(!usuario) return fail(403,{carteira,erro:'Solicite um convite para criar seu cadastro.',etapa:'carteira'});
      return {carteira,etapa:'senha'};
    }
    if(!conferirSenha(senha,usuario?.senha_hash??FALSA)||!usuario) return fail(400,{carteira,erro:'Carteira ou senha incorretos.',etapa:'senha'});
    if(usuario.status!=='ativo') return fail(403,{carteira,erro:MENSAGENS[usuario.status],etapa:'senha'});
    await criarSessao(cookies,usuario.id);
    redirect(303,usuario.trocar_senha?'/trocar-senha':'/');
  }
};
