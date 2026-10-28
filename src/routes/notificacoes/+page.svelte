<script lang="ts">
 import {enhance} from '$app/forms';
 import Aviso from '#lib/componentes/Aviso.svelte';
 import {formatarData} from '#lib/util';
 let {data,form}=$props();
 const atualizar:NonNullable<Parameters<typeof enhance>[1]>=()=>async({update})=>{await update();window.dispatchEvent(new Event('notificacoes-atualizadas'));};
</script>
<svelte:head><title>Notificações · Escala Local</title></svelte:head>
<div class="flex flex-wrap items-center justify-between gap-3"><div><h1 class="titulo">Notificações</h1><p class="mt-2 text-sm text-gray-600">Avisos sobre as escalas publicadas na sua área.</p></div>{#if data.notificacoesNaoLidas}<form method="POST" action="?/lerTodas" use:enhance={atualizar}><button class="btn btn-secundario">Marcar todas como lidas</button></form>{/if}</div>
<Aviso {form}/>
{#if data.avisos.length===50}<p class="mt-4 text-xs text-gray-500">Exibindo as 50 notificações mais recentes.</p>{/if}
<div class="space-y-3 mt-5">{#each data.avisos as n (n.id)}<article class="cartao" class:border-l-4={!n.lida_em} class:border-l-demo-azul={!n.lida_em}><div class="flex flex-wrap items-center justify-between gap-2"><h2 class="font-semibold">{n.titulo}</h2><span class="selo {n.lida_em?'bg-gray-100 text-gray-600':'bg-blue-50 text-blue-800'}">{n.lida_em?'Lida':'Não lida'}</span></div><p class="mt-2 text-sm text-gray-600">{n.mensagem}</p><p class="mt-2 text-xs text-gray-500">{formatarData(n.criado_em.slice(0,10))} · {n.criado_em.slice(11,16)}</p><div class="mt-4 flex flex-wrap gap-2"><form method="POST" action="?/abrir" use:enhance><input type="hidden" name="id" value={n.id}/><button class="btn btn-primario">Ver escala</button></form>{#if !n.lida_em}<form method="POST" action="?/ler" use:enhance={atualizar}><input type="hidden" name="id" value={n.id}/><button class="btn btn-secundario">Marcar como lida</button></form>{/if}</div></article>{:else}<p class="cartao text-sm text-gray-600">Você ainda não tem notificações.</p>{/each}</div>
