<script lang="ts">
	import { enhance } from '$app/forms';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import { abrevCargo, formatarDataLonga, horario, resumoDisponibilidade } from '#lib/util';

	let { data, form } = $props();
 const pendentes=$derived([...data.cadastros.map(cadastro=>({tipo:'cadastro' as const,cadastro})),...data.indicacoes.map(escala=>({tipo:'escala' as const,escala}))]);
</script>
<h1 class="titulo">Aprovações pendentes</h1>
<p class="mb-4 text-sm text-gray-600">Todos os cadastros e solicitações de escala aguardando a coordenação, em uma única lista.</p>
<Aviso {form}/>
<section aria-label="Aprovações pendentes">
<p class="my-3 text-sm text-gray-600">{pendentes.length} {pendentes.length===1?'aprovação pendente':'aprovações pendentes'}</p>
<div class="space-y-3">
{#each pendentes as item (item.tipo+'-'+(item.tipo==='cadastro'?item.cadastro.id:item.escala.id))}
{#if item.tipo==='cadastro'}{@const u=item.cadastro}
<article class="cartao"><p class="mb-2 text-xs text-gray-500">Cadastro de acesso</p>
				<h3 class="font-semibold">{abrevCargo(u.cargo)} – {u.nome}</h3>
				<dl class="mt-1 grid grid-cols-[auto_1fr] gap-x-3 text-sm">
					<dt class="text-gray-500">Carteira:</dt>
					<dd>{u.carteira}</dd>
					<dt class="text-gray-500">Congregação:</dt>
					<dd>{u.congregacao}</dd>
					<dt class="text-gray-500">WhatsApp:</dt>
					<dd>{u.whatsapp || '—'}</dd>
					<dt class="text-gray-500">Disponível:</dt>
					<dd>{resumoDisponibilidade(u.disponibilidade)}</dd>
					<dt class="text-gray-500">Cadastro:</dt>
					<dd>
						{u.cadastrado_por_nome ? `pelo ${u.cadastrado_por_nome}` : 'feito pelo próprio obreiro'}
						<span class="text-gray-500">em {u.criado_em.slice(0, 10).split('-').reverse().join('/')}</span>
					</dd>
				</dl>
				<div class="mt-3 flex flex-wrap items-start gap-2">
					<form method="POST" action="?/aprovarCadastro" use:enhance>
						<input type="hidden" name="id" value={u.id} />
						<button class="btn btn-sucesso">Aprovar acesso</button>
					</form>
					<a class="btn btn-secundario" href="/obreiros/{u.id}">Revisar dados</a>
				</div>
				<details class="mt-2 text-sm">
					<summary class="cursor-pointer text-red-700">Recusar cadastro</summary>
					<form method="POST" action="?/recusarCadastro" use:enhance class="mt-2 flex gap-2">
						<input type="hidden" name="id" value={u.id} />
						<input class="campo" name="motivo" required placeholder="Motivo da recusa" aria-label="Motivo da recusa" />
						<button class="btn btn-perigo">Recusar</button>
					</form>
				</details>
			</article>
{:else}{@const i=item.escala}
<article class="cartao flex flex-wrap items-center justify-between gap-3">
				<div class="text-sm"><p class="mb-2 text-xs text-gray-500">Solicitação de escala</p>
					<p class="font-semibold">{abrevCargo(i.cargo)} – {i.nome}</p>
					<p>
						{i.tipo} · {i.congregacao}{i.ponto ? ` · ${i.ponto}` : ''}
					</p>
					<p class="text-gray-600">
						<a class="btn-link" href="/escala?data={i.data}">{formatarDataLonga(i.data)}</a>, {horario(i.hora_inicio, i.hora_fim)}
						· indicado por {i.indicado_por_nome}
					</p>
				</div>
				<div class="flex gap-2">
					<form method="POST" action="?/autorizarIndicacao" use:enhance>
						<input type="hidden" name="id" value={i.id} />
						<button class="btn btn-sucesso">Autorizar</button>
					</form>
					<form method="POST" action="?/recusarIndicacao" use:enhance>
						<input type="hidden" name="id" value={i.id} />
						<button class="btn btn-secundario">Recusar</button>
					</form>
				</div>
			</article>
{/if}
{:else}<p class="cartao text-sm text-gray-600">Nenhuma aprovação pendente.</p>{/each}
</div></section>