<script lang="ts">
import {onMount} from 'svelte';
import {enhance} from '$app/forms';
import CamposObreiro from '#lib/componentes/CamposObreiro.svelte';
import Aviso from '#lib/componentes/Aviso.svelte';
import Rodape from '#lib/componentes/Rodape.svelte';
import CampoSenha from '#lib/componentes/CampoSenha.svelte';
import {PERFIS} from '#lib/util';
let {data,form}=$props();
const detalhes=$derived(form&&('etapa' in form&&form.etapa==='perfil'||'valores' in form&&!!form.valores));
let enviando=$state(false),pronto=$state(false);
onMount(()=>{pronto=true;});
</script>
<svelte:head><title>Seu convite · Escala Local</title></svelte:head>
<div class="register-page" data-pronto={pronto}><header class="public-header"><a href="/login"><img src="/marca-demo.png" alt="DEMO" width="40" height="40"/><strong>Escala Local<small>Cadastro por convite</small></strong></a><a href="/login" class="btn btn-link">Já tenho acesso</a></header>
<main class="register-main"><div class="register-heading"><span class="eyebrow">VOCÊ FOI CONVIDADO</span><h1>{PERFIS[data.perfilConvite]}</h1><p>{data.area?'Área '+data.area.codigo+' · Polo '+data.area.polo:''}</p></div>
{#if form&&'concluido' in form&&form.concluido}
  <section class="cartao p-6"><h2 class="titulo">Cadastro enviado!</h2><p class="mt-3 text-sm text-gray-600">Seu perfil está aguardando autorização do coordenador ou vice. Depois da aprovação, entre com sua carteira e a senha criada.</p><a href="/login" class="btn btn-primario mt-5">Voltar para entrar</a></section>
{:else if !data.valido}
  <section class="cartao p-6"><h2 class="titulo">Este convite não está disponível</h2><p class="mt-3 text-sm text-gray-600">{data.motivo} O link expirou, já foi utilizado ou foi desativado. Peça um novo convite a quem enviou.</p><a href="/login" class="btn btn-secundario mt-5">Voltar</a></section>
{:else}
  <section class="cartao p-5"><p class="text-sm text-gray-600">Convite do <strong>{data.convidadoFuncao} {data.convidadoPor}</strong>.</p><p class="mt-2 mb-5 text-sm text-gray-600">{data.acessoImediato?'Seu acesso é liberado após seu cadastro.':'A coordenação vai conferir e aprovar seu cadastro.'}</p><Aviso {form}/>
  {#if !detalhes}<form method="POST" action="?/continuar" use:enhance><p class="step-label">1 DE 2 · SUA IDENTIFICAÇÃO</p><label class="rotulo" for="carteira-inicial">Nº da carteira de membro</label><input class="campo" id="carteira-inicial" name="carteira" inputmode="numeric" required pattern={'[0-9]{4,20}'} maxlength="20" autocomplete="username" placeholder="Ex.: 26123302"/><button class="btn btn-primario mt-5 w-full">Continuar</button></form>
  {:else}<form method="POST" action="?/salvar" use:enhance={()=>{enviando=true;return async({update})=>{await update({reset:false});enviando=false;};}}><p class="step-label">2 DE 2 · SEU PERFIL E SUA SENHA</p><CamposObreiro perfilCadastro={data.perfilConvite} funcaoCoordenacao={data.perfilConvite==='coordenador'&&!data.area} cargosPermitidos={data.cargosPermitidos} pedirCongregacao={!(['coordenador','vice'].includes(data.perfilConvite))} valores={form&&'valores' in form&&form.valores?form.valores:{carteira:form&&'carteira' in form?form.carteira:''}} congregacoes={data.congregacoes} congregacaoFixa={data.congregacaoFixa} senha={!(form&&'existente' in form&&form.existente)}/>{#if form&&'existente' in form&&form.existente}<div class="mt-4"><CampoSenha id="senha_atual" name="senha_atual" rotulo="Senha atual da sua conta" autocomplete="current-password"/></div>{/if}<button class="btn btn-primario mt-5 w-full" disabled={enviando}>{enviando?'Salvando…':'Concluir meu cadastro'}</button></form>{/if}
  </section>
{/if}</main><Rodape/></div>
