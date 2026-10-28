<script lang="ts">
	import { enhance } from '$app/forms';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import { DIAS_SEMANA, ORDEM_SEMANA, descreverRegra, horario } from '#lib/util';

	let { data, form } = $props();
	const c = $derived(data.congregacao);
	const regrasDoTemplo = $derived(data.regras.filter((r) => r.ponto_id === null));
	const regrasDoPonto = (pontoId: number) => data.regras.filter((r) => r.ponto_id === pontoId);
</script>

{#snippet camposRegra(prefixo: string)}
	<div>
		<label class="rotulo" for="{prefixo}-tipo">Culto</label>
		<select class="campo" id="{prefixo}-tipo" name="tipo_culto_id" required>
			{#each data.tipos as t (t.id)}
				<option value={t.id} selected={prefixo.startsWith('ponto') && t.nome === 'Ponto de Pregação'}>{t.nome}</option>
			{/each}
		</select>
	</div>
	<div>
		<label class="rotulo" for="{prefixo}-dia">Dia</label>
		<select class="campo" id="{prefixo}-dia" name="dia_semana" required>
			{#each ORDEM_SEMANA as d (d)}
				<option value={d}>{DIAS_SEMANA[d]}</option>
			{/each}
		</select>
	</div>
	<div>
		<label class="rotulo" for="{prefixo}-semana">Frequência</label>
		<select class="campo" id="{prefixo}-semana" name="semana_mes">
			<option value="">Toda semana</option>
			{#each [1, 2, 3, 4, 5] as n (n)}
				<option value={n}>Só na {n}ª semana do mês</option>
			{/each}
		</select>
	</div>
	<div class="grid grid-cols-2 gap-2">
		<div>
			<label class="rotulo" for="{prefixo}-ini">Início</label>
			<input class="campo" id="{prefixo}-ini" name="hora_inicio" type="time" />
		</div>
		<div>
			<label class="rotulo" for="{prefixo}-fim">Término</label>
			<input class="campo" id="{prefixo}-fim" name="hora_fim" type="time" />
		</div>
	</div>
{/snippet}

{#snippet listaRegras(regras: typeof data.regras, podeRemover: boolean)}
	<ul class="divide-y divide-gray-100 text-sm">
		{#each regras as r (r.id)}
			<li class="flex items-center justify-between gap-2 py-1.5">
				<span>
					<strong class="font-medium">{r.tipo}</strong>
					<span class="text-gray-600">· {descreverRegra(r)} · {horario(r.hora_inicio, r.hora_fim)}</span>
				</span>
				{#if podeRemover}
					<form method="POST" action="?/removerRegra" use:enhance>
						<input type="hidden" name="id" value={r.id} />
						<button class="btn-link cursor-pointer text-xs text-red-700">Remover</button>
					</form>
				{/if}
			</li>
		{:else}
			<li class="py-1.5 text-gray-500">Nenhum culto fixo.</li>
		{/each}
	</ul>
{/snippet}

<a class="btn-link text-sm" href="/congregacoes">‹ Congregações</a>
<div class="mt-1 flex flex-wrap items-center gap-2">
	<h1 class="titulo">{c.nome}</h1>
	<span class="selo bg-gray-100 text-gray-600">{c.codigo} · Área {c.area}{c.sede ? ' · Sede' : ''}</span>
</div>
<p class="mb-4 text-sm text-gray-600">
	{c.endereco || 'Endereço não informado'}
	{#if c.maps}· <a class="btn-link" href={c.maps} target="_blank" rel="noreferrer">abrir no mapa</a>{/if}
</p>

<Aviso {form} />

<div class="grid gap-4 lg:grid-cols-2">
	<section class="cartao">
		<h2 class="font-semibold text-marca-noite">Agenda do templo</h2>
		<p class="mb-2 text-xs text-gray-500">
			Cultos mensais (ex.: Santa Ceia) substituem o culto semanal do mesmo dia e horário.
		</p>
		{@render listaRegras(regrasDoTemplo, data.admin)}
		{#if data.admin}
			<details class="mt-3">
				<summary class="cursor-pointer text-sm text-marca-escuro">+ Adicionar culto fixo no templo</summary>
				<form method="POST" action="?/novaRegra" use:enhance class="mt-2 grid gap-2 sm:grid-cols-2">
					{@render camposRegra('templo')}
					<div class="sm:col-span-2"><button class="btn btn-primario">Adicionar</button></div>
				</form>
			</details>

			<details class="mt-4 border-t border-gray-100 pt-3">
				<summary class="cursor-pointer text-sm text-marca-escuro">Editar dados da congregação</summary>
				<form method="POST" action="?/salvarCongregacao" use:enhance class="mt-2 space-y-2">
					<input class="campo" name="nome" value={c.nome} required aria-label="Nome" />
					<input class="campo" name="endereco" value={c.endereco} placeholder="Endereço" aria-label="Endereço" />
					<input class="campo" name="maps" value={c.maps} placeholder="Link do Google Maps" aria-label="Link do Google Maps" />
					<button class="btn btn-secundario">Salvar</button>
				</form>
			</details>
		{/if}
	</section>

	<section class="space-y-3">
		<div class="cartao">
			<h2 class="font-semibold text-marca-noite">Pontos de pregação ({data.pontos.filter((p) => p.ativo).length})</h2>
			{#if data.pontos.length === 0}
				<p class="mt-1 text-sm text-gray-500">Esta congregação ainda não tem pontos de pregação cadastrados.</p>
			{/if}
			{#if data.podeGerir}
				<details class="mt-3" open={data.pontos.length === 0}>
					<summary class="cursor-pointer text-sm text-marca-escuro">+ Cadastrar ponto de pregação</summary>
					<form method="POST" action="?/novoPonto" use:enhance class="mt-2 grid gap-2 sm:grid-cols-2">
						<div class="sm:col-span-2">
							<label class="rotulo" for="np-nome">Local</label>
							<input class="campo" id="np-nome" name="nome" required placeholder="Ex.: Casa do Ir. João Clementino" />
						</div>
						<div>
							<label class="rotulo" for="np-end">Endereço</label>
							<input class="campo" id="np-end" name="endereco" />
						</div>
						<div>
							<label class="rotulo" for="np-maps">Link do mapa</label>
							<input class="campo" id="np-maps" name="maps" placeholder="Opcional" />
						</div>
						{@render camposRegra('ponto-novo')}
						<div class="sm:col-span-2"><button class="btn btn-primario">Cadastrar ponto</button></div>
					</form>
				</details>
			{/if}
		</div>

		{#each data.pontos as p (p.id)}
			<article class="cartao {p.ativo ? '' : 'opacity-60'}">
				<div class="flex items-start justify-between gap-2">
					<div>
						<h3 class="font-semibold">{p.nome}</h3>
						<p class="text-xs text-gray-600">
							{p.endereco || 'Endereço não informado'}
							{#if p.maps}· <a class="btn-link" href={p.maps} target="_blank" rel="noreferrer">mapa</a>{/if}
						</p>
					</div>
					{#if !p.ativo}<span class="selo bg-gray-200 text-gray-700">Desativado</span>{/if}
				</div>
				<div class="mt-2">{@render listaRegras(regrasDoPonto(p.id), data.podeGerir)}</div>
				{#if data.podeGerir}
					<details class="mt-2">
						<summary class="cursor-pointer text-sm text-marca-escuro">+ Adicionar dia/horário</summary>
						<form method="POST" action="?/novaRegra" use:enhance class="mt-2 grid gap-2 sm:grid-cols-2">
							<input type="hidden" name="ponto_id" value={p.id} />
							{@render camposRegra(`ponto-${p.id}`)}
							<div class="sm:col-span-2"><button class="btn btn-primario">Adicionar</button></div>
						</form>
					</details>
					<details class="mt-2">
						<summary class="cursor-pointer text-sm text-marca-escuro">Editar ponto</summary>
						<form method="POST" action="?/salvarPonto" use:enhance class="mt-2 space-y-2">
							<input type="hidden" name="id" value={p.id} />
							<input class="campo" name="nome" value={p.nome} required aria-label="Local" />
							<input class="campo" name="endereco" value={p.endereco} placeholder="Endereço" aria-label="Endereço" />
							<input class="campo" name="maps" value={p.maps} placeholder="Link do mapa" aria-label="Link do mapa" />
							<label class="flex items-center gap-2 text-sm">
								<input type="checkbox" name="ativo" checked={!!p.ativo} class="accent-marca" /> Ponto ativo
							</label>
							<button class="btn btn-secundario">Salvar</button>
						</form>
					</details>
				{/if}
			</article>
		{/each}
	</section>
</div>
