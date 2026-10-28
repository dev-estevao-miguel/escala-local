<script lang="ts">
  import {enhance} from '$app/forms';
  import Rodape from '#lib/componentes/Rodape.svelte';
  import Icone from '#lib/componentes/Icone.svelte';
  import CampoSenha from '#lib/componentes/CampoSenha.svelte';
  import { VERSAO } from '#lib/util';
  let {form}=$props();
  let enviando=$state(false),mostrar=$state(false);
</script>
<svelte:head><title>Entrar · Escala Local</title></svelte:head>
<div class="login-page">
<header class="public-header"><a href="/login"><img src="/marca-demo.png" alt="DEMO" width="42" height="42"/><strong>Escala Local <small>DEMO</small></strong></a><span class="version-badge">{VERSAO}</span></header>
<main class="login-main">
  <div class="login-intro"><img src="/marca-demo.png" alt="Igreja Demo" width="80" height="80"/><p class="eyebrow">DEMO · ESCALA LOCAL</p><h1>Servir com organização.<br/>Caminhar em comunhão.</h1><p>Suas escalas, sua congregação e seu serviço<br class="hidden sm:block"/> em um só lugar.</p></div>
  <div class="login-form-column"><form method="POST" class="login-card" use:enhance={()=>{enviando=true;return async({update})=>{await update({reset:false});enviando=false;};}}>
    <span class="eyebrow">BEM-VINDO À ESCALA LOCAL</span><h2>{form?.etapa==='cadastrar-admin'?'Cadastre a senha do administrador':form?.etapa==='senha'?'Agora, sua senha':'Acesse sua conta'}</h2><p>{form?.etapa==='cadastrar-admin'?'Crie sua nova senha. Ela ficará salva para os próximos acessos.':form?.etapa==='senha'?'Entre com a senha que você criou.':'Informe sua carteira para acessar sua conta.'}</p>
    <label class="rotulo mt-6" for="carteira">Nº da carteira de membro</label><input class="campo" id="carteira" name="carteira" inputmode="numeric" pattern={'[0-9]{4,20}'} maxlength="20" autocomplete="username" required readonly={form?.etapa==='senha'||form?.etapa==='cadastrar-admin'} value={form?.carteira??''} placeholder="Ex.: 26123302"/>
    {#if form?.etapa==='cadastrar-admin'}
      <input type="hidden" name="cadastrar_admin" value="1"/>
      <div class="mt-4"><CampoSenha id="nova" name="nova" rotulo="Nova senha do administrador" minlength={10}/></div>
      <div class="mt-4"><CampoSenha id="nova2" name="nova2" rotulo="Repita a nova senha" minlength={10}/></div>
      <p class="mt-2 text-xs">Use pelo menos 10 caracteres. Esta configuração pode ser concluída somente uma vez com este link.</p>
    {/if}
    {#if form?.etapa==='senha'}<label class="rotulo mt-4" for="senha">Senha</label><div class="password-field"><input class="campo" id="senha" name="senha" type={mostrar?'text':'password'} autocomplete="current-password" required maxlength="128"/><button type="button" class="icon-button" aria-label={mostrar?'Ocultar senha':'Mostrar senha'} onclick={()=>mostrar=!mostrar}><Icone nome="olho" tamanho={20}/></button></div>{/if}
    {#if form?.erro}<p role="alert" class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{form.erro}</p>{/if}
    <button class="btn btn-primario mt-5 w-full" disabled={enviando}>{enviando?'Aguarde…':form?.etapa==='cadastrar-admin'?'Salvar senha e entrar':form?.etapa==='senha'?'Entrar':'Continuar'}<Icone nome="seta" tamanho={18}/></button>
    {#if form?.etapa==='senha'}<a class="btn btn-link mt-2 w-full" href="/login">Usar outra carteira</a><p class="mt-2 text-xs">Esqueceu a senha? Peça a redefinição à coordenação.</p>{/if}
    <div class="login-divider">Primeiro acesso?</div><p class="text-center text-sm">Abra o convite enviado pelo administrador, pela coordenação ou pelo responsável da sua igreja.</p>
  </form></div>
</main><Rodape tom="claro"/>
</div>
