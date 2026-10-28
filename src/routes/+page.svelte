<script lang="ts">
 import {enhance} from '$app/forms';
 import Aviso from '#lib/componentes/Aviso.svelte';import LinkConvite from '#lib/componentes/LinkConvite.svelte';import InstalarApp from '#lib/componentes/InstalarApp.svelte';import ResumoDashboard from '#lib/componentes/ResumoDashboard.svelte';import CartaoEscala from '#lib/componentes/CartaoEscala.svelte';
 import {ehAdminGeral,ehAdmin,ehPb,formatarDataLonga,linkWhatsApp,textoEscala} from '#lib/util';
 let {data,form}=$props();
 const convite=$derived(form&&'link' in form&&form.link?form:data.convite);
</script>
<Aviso {form}/>
{#if ehAdminGeral(data.user)}
 <h1 class="titulo">Administração da plataforma</h1><section class="cartao mt-4"><h2 class="font-semibold">Convite para Coordenadores</h2>{#if convite}<LinkConvite link={convite.link}/><form method="POST" action="?/convidarCoordenador" use:enhance class="mt-3"><input type="hidden" name="regenerar" value="1"/><button class="btn btn-secundario">Regenerar link</button></form>{:else}<p class="text-sm text-gray-600 mt-2">Um único link para convidar os futuros coordenadores.</p><form method="POST" action="?/convidarCoordenador" use:enhance class="mt-4"><button class="btn btn-primario">Convidar Coordenador</button></form>{/if}</section><a class="btn btn-secundario mt-4" href="/coordenadores">Gerenciar Coordenadores</a>
{:else if !data.area}
 <section class="cartao"><h1 class="titulo">Você ainda não possui uma Área vinculada.</h1>{#if ['coordenador','vice'].includes(data.user!.perfil)&&data.user!.pode_definir_area}<p class="text-sm mt-3">Informe sua Área. Depois de confirmar, somente o Administrador poderá alterar essa vinculação.</p><form method="POST" action="?/definirArea" use:enhance class="mt-4 space-y-3"><label class="rotulo" for="codigo">Nº da Área</label><input class="campo" id="codigo" name="codigo" inputmode="numeric" pattern={'[0-9]{1,3}'} required placeholder="Ex.: 57"/><button class="btn btn-primario">Confirmar minha Área</button></form>{:else}<p class="mt-3 text-sm">Sua conta está aguardando vinculação de Área pelo Administrador.</p>{/if}</section>
{:else if ehAdmin(data.user)&&data.resumo}
 <ResumoDashboard resumo={data.resumo}/>
{:else}
 <h1 class="titulo">{ehPb(data.user)?'Minha congregação':'Minhas escalas'}</h1>{#if ehPb(data.user)}<div class="flex flex-wrap gap-2 mt-4"><a class="btn btn-primario" href="/eventos">Eventos da congregação</a><a class="btn btn-secundario" href="/obreiros">Obreiros e convites</a></div>{/if}
 <section class="mt-5 space-y-3">{#each data.minhas as e (e.id)}<CartaoEscala escala={e} escalado={e}>{#snippet acoes()}<div class="flex flex-wrap gap-2">{#if e.resposta!=='confirmado'}<form method="POST" action="?/confirmar" use:enhance><input type="hidden" name="id" value={e.id}/><button class="btn btn-sucesso">Confirmar presença</button></form>{/if}<a class="btn btn-secundario" href={linkWhatsApp(textoEscala(e,e))} target="_blank" rel="noreferrer">Enviar no WhatsApp</a></div><details class="mt-3 text-sm"><summary>Justificar ausência</summary><form method="POST" action="?/justificar" use:enhance class="mt-2 space-y-2"><input type="hidden" name="id" value={e.id}/><textarea class="campo" name="justificativa" required rows="2" aria-label="Motivo da ausência"></textarea><button class="btn btn-secundario">Enviar justificativa</button></form></details>{/snippet}</CartaoEscala>{:else}<p class="cartao text-sm text-gray-600">Nenhuma escala pessoal nos próximos dias.</p>{/each}</section>
{/if}
<InstalarApp/>
