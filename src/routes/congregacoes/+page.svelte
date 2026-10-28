<script lang="ts">
 import {enhance} from '$app/forms';
 import Aviso from '#lib/componentes/Aviso.svelte';
	import { nomeArea, ehAdmin } from '#lib/util';

	let { data,form } = $props();
</script>

<h1 class="titulo">Congregações</h1>
<p class="mb-4 text-sm text-gray-600">{data.area && nomeArea(data.area)} · {data.congregacoes.length} congregações</p>
{#if ehAdmin(data.user)}<a href="/minha-area" class="btn btn-primario mb-4">Ver Minha Área</a>{/if}
{#if !data.congregacoes.length}<p class="cartao text-sm text-gray-600">As igrejas desta área ainda não foram cadastradas pela coordenação.</p>{/if}

<Aviso {form}/><div class="grid gap-3 md:grid-cols-2">
	{#each data.congregacoes as c (c.id)}
		<div><a href="/congregacoes/{c.id}" class="cartao block hover:ring-2 hover:ring-marca/40">
			<div class="flex items-start justify-between gap-2">
				<h2 class="font-semibold text-marca-noite">{c.nome}</h2>
				<span class="selo bg-gray-100 text-gray-600">{c.codigo}{c.sede ? ' · Sede' : ''}</span>
			</div>
			<p class="mt-1 text-sm text-gray-600">{c.endereco || 'Endereço não informado'}</p>
            {#if c.polo}<p class="mt-1 text-xs text-gray-500">{c.polo}</p>{/if}
			<p class="mt-2 text-xs text-gray-500">
				{c.pontos} ponto(s) de pregação · {c.obreiros} obreiro(s)
				· Responsável: {c.responsaveis.length?c.responsaveis.join(', '):'Não definido'}
			</p>
		</a>{#if data.podeTrocar}<details class="cartao mt-1 text-sm"><summary>{c.responsaveis.length?'Alterar responsável':'Adicionar responsável'}</summary><p class="mt-2"><a class="btn-link" href="/obreiros">Gerar convite para responsáveis</a></p><form method="POST" action="?/responsavel" use:enhance class="mt-3 space-y-2"><input type="hidden" name="congregacao_id" value={c.id}/><select class="campo" name="usuario_id" aria-label="Novo responsável"><option value="0">Remover responsabilidade atual</option>{#each data.candidatos as o (o.id)}<option value={o.id}>{o.nome}</option>{/each}</select><button class="btn btn-secundario">Confirmar alteração</button></form></details>{/if}</div>
	{/each}
</div>
