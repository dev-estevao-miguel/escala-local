<script lang="ts">
 import '../app.css';import {page} from '$app/state';import {afterNavigate} from '$app/navigation';import {onMount} from 'svelte';
 import Rodape from '#lib/componentes/Rodape.svelte';import Icone from '#lib/componentes/Icone.svelte';import {iniciarInstalacao} from '#lib/pwa.svelte';
 import IndicadorNotificacoes from '#lib/componentes/IndicadorNotificacoes.svelte';
 import {PERFIS,VERSAO,nomeNaEscala,saudacao,ehAdmin,ehAdminGeral,ehPb,podeCadastrarObreiro} from '#lib/util';
 let {data,children}=$props();let menu=$state(false),lateral=$state<HTMLDialogElement>(null!),pronto=$state(false);
 onMount(()=>{pronto=true;});
 onMount(iniciarInstalacao);afterNavigate(()=>{menu=false;lateral?.close();});
 const links=$derived.by(()=>{
  const u=data.user;if(!u)return [];
  const base=[{href:'/',nome:'Início',icone:'inicio',secao:'PRINCIPAL',contador:0}];
  if(ehAdminGeral(u))return [...base,{href:'/coordenadores',nome:'Gerenciar Coordenadores',icone:'obreiros',secao:'PLATAFORMA',contador:0},{href:'/plataforma',nome:'Administração técnica',icone:'plataforma',secao:'PLATAFORMA',contador:0},{href:'/perfil',nome:'Minha conta',icone:'perfil',secao:'CONTA',contador:0}];
  return [...base,...(data.area?[
   {href:'/escala',nome:'Escalas',icone:'escala',secao:'PRINCIPAL',contador:0},
   {href:'/eventos',nome:ehAdmin(u)?'Eventos na Área':'Eventos locais',icone:'escala',secao:'CONGREGAÇÕES',contador:0},
   ...(ehAdmin(u)?[{href:'/minha-area',nome:'Minha Área',icone:'igreja',secao:'ÁREA',contador:0},{href:'/aprovacoes',nome:'Aprovações pendentes',icone:'aprovacoes',secao:'ÁREA',contador:data.pendencias}]:[]),
   ...(podeCadastrarObreiro(u)?[{href:'/obreiros',nome:'Obreiros e convites',icone:'obreiros',secao:'ÁREA',contador:0}]:[]),
   ...(!ehAdmin(u)?[{href:'/congregacoes',nome:'Minha congregação',icone:'igreja',secao:'CONGREGAÇÕES',contador:0}]:[]),
   {href:'/notificacoes',nome:'Notificações',icone:'sino',secao:'CONTA',contador:data.notificacoesNaoLidas}
  ]:[]),{href:'/perfil',nome:'Meu perfil',icone:'perfil',secao:'CONTA',contador:0}];
 });
 const ativo=(href:string)=>href==='/'?page.url.pathname==='/':page.url.pathname.startsWith(href);
 const atual=$derived(links.find(l=>ativo(l.href))??links[0]);
 const iniciais=$derived(data.user?.nome.split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('')??'');
 const contexto=$derived(ehAdminGeral(data.user)?'Administração geral':data.area?`Área ${data.area.codigo} · ${data.area.polo}`:'Aguardando vinculação de Área');
</script>
<svelte:head><title>Escala Local{data.area?` · Área ${data.area.codigo}`:''}</title></svelte:head>
{#snippet navegacao()}<div class="area-card"><strong>{contexto}</strong></div><nav aria-label="Menu principal" class="side-nav">{#each links as l,i (l.href)}{#if i===0||links[i-1].secao!==l.secao}<p class="nav-section">{l.secao}</p>{/if}<a href={l.href} class:selecionado={ativo(l.href)} aria-current={ativo(l.href)?'page':undefined}><Icone nome={l.icone}/><span>{l.nome}</span>{#if l.contador}<b class="nav-count">{l.contador}</b>{/if}</a>{/each}</nav><form method="POST" action="/sair" class="side-logout"><button><Icone nome="sair"/>Sair da conta</button></form>{/snippet}
{#if data.user&&!data.user.trocar_senha}
 <a class="skip-link" href="#conteudo">Pular para o conteúdo</a><header class="app-header"><button class="icon-button menu-toggle" type="button" aria-label="Abrir menu" onclick={()=>lateral.showModal()}><Icone nome="menu" tamanho={25}/></button><a href="/" class="app-brand"><img src="/marca-demo.png" width="40" height="40" alt="DEMO"/><span><strong>Escala Local</strong><small>{contexto}</small></span></a><div class="header-spacer"></div><span class="version-badge">{VERSAO}</span>{#if data.area&&!ehAdminGeral(data.user)}<IndicadorNotificacoes iniciais={data.notificacoesNaoLidas}/>{/if}<div class="user-menu"><button class="user-button" type="button" aria-expanded={menu} aria-label="Abrir menu da conta" onclick={()=>menu=!menu}><span class="avatar">{#if data.user.foto_versao}<img src={'/perfil/foto?v='+data.user.foto_versao} alt="Sua foto de perfil" class="size-full rounded-full" style="object-fit:cover"/>{:else}{iniciais}{/if}</span><span class="user-caption"><strong>{nomeNaEscala(data.user)}</strong><small>{PERFIS[data.user.perfil]}</small></span></button>{#if menu}<div class="user-dropdown"><strong>{data.user.nome}</strong><p>Carteira {data.user.carteira}</p><a href="/perfil">Minha conta</a><form method="POST" action="/sair"><button>Sair da conta</button></form></div>{/if}</div></header>
 <div class="app-shell"><aside class="desktop-sidebar">{@render navegacao()}</aside><div class="app-content"><section class="page-band"><div><p>Escala Local <span aria-hidden="true">›</span> {atual?.nome}</p><h2>{page.url.pathname==='/'?(ehAdminGeral(data.user)?'Administração da plataforma':saudacao(data.user)):atual?.nome}</h2><span>{contexto}</span></div></section><main id="conteudo" data-pronto={pronto} class="main-content" tabindex="-1">{@render children()}</main><Rodape/></div></div>
 <dialog class="drawer" bind:this={lateral} aria-label="Menu de navegação"><div class="drawer-heading"><strong>Escala Local</strong><button class="icon-button" type="button" aria-label="Fechar menu" onclick={()=>lateral.close()}><Icone nome="fechar"/></button></div>{@render navegacao()}</dialog>
 <nav class="bottom-nav" aria-label="Navegação rápida">{#each links.slice(0,2) as l (l.href)}<a href={l.href} class:selecionado={ativo(l.href)} aria-current={ativo(l.href)?'page':undefined}><Icone nome={l.icone}/><span>{l.nome}</span></a>{/each}<a href="/perfil" class:selecionado={ativo('/perfil')}><Icone nome="perfil"/><span>Conta</span></a><button type="button" onclick={()=>lateral.showModal()}><Icone nome="menu"/><span>Mais</span></button></nav>
{:else}{@render children()}{/if}
