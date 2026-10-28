<script lang="ts">
 import {enhance} from '$app/forms';
 import Aviso from '#lib/componentes/Aviso.svelte';
 import {nomeNaEscala,PERFIS} from '#lib/util';
 let {data,form}=$props();
</script>
<h1 class="titulo">Gerenciar Coordenadores</h1>
<p class="mt-2 mb-4 text-sm text-gray-600">Vincule, mova, desvincule ou exclua cadastros de coordenadores e vices. As congregações e o histórico de cada área são preservados.</p>
<Aviso {form}/>
<div class="space-y-3 mt-4">
 {#each data.coordenadores as c (c.id)}
  <article class="cartao">
   <p class="text-sm text-gray-500">{c.area?'Área '+c.area:'Sem Área'}</p>
   <h2 class="font-semibold mt-1">{c.nome}</h2>
   <p class="text-xs mt-1 text-gray-500">{PERFIS[c.perfil]} · {nomeNaEscala(c)} · Carteira {c.carteira}</p>
   <details class="mt-3 text-sm">
    <summary>Alterar vinculação</summary>
    <form method="POST" action="?/vincular" use:enhance class="flex flex-wrap gap-2 mt-3">
     <input type="hidden" name="id" value={c.id}/>
     <input class="campo w-full sm:w-40" aria-label={'Nova área de '+c.nome} name="codigo" inputmode="numeric" pattern={'[0-9]{1,3}'} required placeholder="Nº da Área"/>
     <button class="btn btn-primario">Vincular à área</button>
    </form>
    {#if c.area}
     <form method="POST" action="?/desvincular" use:enhance class="mt-3">
      <input type="hidden" name="id" value={c.id}/>
      <button class="btn btn-secundario">Desvincular {c.perfil==='vice'?'vice-coordenador':'coordenador'}</button>
     </form>
    {/if}
    {#if c.perfil==='coordenador'}<p class="mt-3 text-xs text-gray-500">Se a área de destino já tiver coordenador principal, ele ficará sem área e aguardará nova vinculação.</p>{/if}
   </details>
   <details class="mt-4 text-sm">
    <summary class="text-red-700">Excluir cadastro</summary>
    <p class="mt-3 text-gray-600">O acesso de {c.nome} será encerrado e seus convites serão cancelados. As igrejas, os demais usuários e o histórico de eventos e escalas serão preservados. Um novo acesso exigirá novo cadastro por convite.</p>
    <form method="POST" action="?/excluir" use:enhance class="mt-3 space-y-3">
     <input type="hidden" name="id" value={c.id}/>
     <label class="rotulo" for={'confirmar-'+c.id}>Digite a carteira {c.carteira} para confirmar</label>
     <input class="campo" id={'confirmar-'+c.id} name="carteira" required inputmode="numeric" autocomplete="off"/>
     <button class="btn btn-secundario text-red-700">Confirmar exclusão</button>
    </form>
   </details>
  </article>
 {:else}<p class="cartao text-sm">Nenhum coordenador cadastrado. Envie o convite da tela inicial.</p>{/each}
</div>
