<script lang="ts">
 let {data}=$props();
 const horario=$derived(new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'medium',timeZone:'America/Sao_Paulo'}).format(new Date(data.verificadoEm)));
</script>
<svelte:head><title>Integridade do sistema · Escala Local</title></svelte:head>
<h1 class="titulo">Administração técnica</h1>
<p class="mt-2 text-sm text-gray-600">Acompanhe a integridade do sistema e os problemas registrados.</p>
<section class="cartao mt-4" aria-labelledby="integridade">
 <h2 id="integridade" class="font-semibold">Integridade do sistema</h2>
 <div class="mt-4 rounded-lg p-4 {data.banco.ok?'bg-green-50 text-green-800':'bg-red-50 text-red-800'}" role="status">
  <h3 class="font-semibold">{data.banco.ok?'Banco de dados verificado':'Problema na verificação do banco'}</h3>
  <p class="mt-1 text-sm">{data.banco.mensagem}</p>
 </div>
 <p class="mt-3 text-xs text-gray-500">Última verificação: <time datetime={data.verificadoEm}>{horario}</time> (horário de Brasília).</p>
 <form method="GET" action="/plataforma" class="mt-4"><button class="btn btn-secundario">Atualizar verificação</button></form>
</section>
<section class="cartao mt-4" aria-labelledby="problemas">
 <h2 id="problemas" class="font-semibold">Problemas detectados</h2>
 {#if !data.registrosDisponiveis}
  <p class="mt-3 text-sm text-red-700" role="alert">Não foi possível consultar as falhas registradas. Atualize a verificação para tentar novamente.</p>
 {:else if !data.total}
  <p class="mt-3 text-sm text-gray-600">Nenhuma falha registrada.</p>
 {:else}
  <p class="mt-3 text-sm text-gray-600">{data.total} {data.total===1?'falha registrada':'falhas registradas'}. Registros anteriores podem incluir problemas já corrigidos.</p>
  {#if data.total>data.erros.length}<p class="mt-2 text-xs text-gray-500">Exibindo as {data.erros.length} falhas mais recentes.</p>{/if}
  <ul class="mt-3 divide-y divide-gray-200">
   {#each data.erros as e (e.id)}
    <li class="py-3 break-words"><p class="text-xs text-gray-500">{e.quando} · {e.rota}</p><p class="mt-1 text-sm">{e.mensagem}</p></li>
   {/each}
  </ul>
 {/if}
</section>
