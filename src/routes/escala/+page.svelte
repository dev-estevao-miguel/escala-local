<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import {
		ehAdmin, ehPb,
		DIAS_CURTOS,
		RESPOSTAS,
		abrevCargo,nomeNaEscala,
		cargoPermitido,
		diaSemana,
		formatarData,
		formatarDataLonga,
		horario,
		linkWhatsApp,
		localDoCulto,
		somarDias,
		textoEscala
	} from '#lib/util';

	let { data, form } = $props();

	const admin = $derived(data.admin);
	const link = (dia: string) => `?data=${dia}${data.filtro ? `&cong=${data.filtro}` : ''}`;
	const acao = (nome: string) => `?/${nome}&data=${data.data}${data.filtro ? `&cong=${data.filtro}` : ''}`;

	function navegar(dia: string, cong = data.filtro) {
		goto(`?data=${dia}${cong ? `&cong=${cong}` : ''}`, { reset: false });
	}

	/** Texto da escala do dia inteiro, para enviar no grupo de WhatsApp. */
	const textoDoDia = $derived.by(() => {
		const linhas = [`*Escala Local – DEMO Área ${data.area?.codigo}*`, formatarDataLonga(data.data), ''];
		for (const c of data.cultos) {
			if (c.cancelado) continue;
			const escalados = c.escalas.filter((e) => e.autorizacao === 'autorizada' && e.funcao !== 'auxiliar');
			linhas.push(
				`*${horario(c.hora_inicio, c.hora_fim)} – ${c.nome_evento||c.tipo}*`,
				`Igreja: ${c.congregacao}`,
				`Localização: ${localDoCulto(c)}`,
				`Tema: ${c.tema || 'Livre'}`,
				`Escalado: ${escalados.map((e) => `${abrevCargo(e.cargo)} ${e.nome}`).join(', ') || 'a definir'}`,
				''
			);
		}
		return linhas.join('\n');
	});

</script>

<div class="flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="titulo">Escala do dia</h1>
{#if data.montaEscala}<div class="flex flex-wrap gap-2 my-4"><a class="btn btn-primario" href="/escala/gerar">Gerar Escala Local</a></div>{/if}
		<p class="text-sm text-gray-600">{formatarDataLonga(data.data)}</p>
	</div>
	<div class="flex items-center gap-2">
		<a class="btn btn-secundario" href={link(somarDias(data.data, -1))} aria-label="Dia anterior">‹</a>
		<input
			class="campo w-auto"
			type="date"
			value={data.data}
			aria-label="Escolher data"
			onchange={(e) => e.currentTarget.value && navegar(e.currentTarget.value)}
		/>
		<a class="btn btn-secundario" href={link(somarDias(data.data, 1))} aria-label="Próximo dia">›</a>
	</div>
</div>

<nav class="mt-4 grid grid-cols-7 gap-1" aria-label="Dias da semana">
	{#each data.semana as dia (dia)}
		<a
			href={link(dia)}
			class="rounded-md py-2 text-center text-sm {dia === data.data
				? 'bg-demo-azul font-semibold text-white'
				: 'bg-white text-gray-700 hover:bg-gray-50'}"
			aria-current={dia === data.data ? 'date' : undefined}
		>
			<span class="block text-xs uppercase opacity-80">{DIAS_CURTOS[diaSemana(dia)]}</span>
			{dia.slice(8)}
			{#if dia === data.hoje}<span class="block text-[10px] leading-none">hoje</span>{/if}
		</a>
	{/each}
</nav>

<div class="mt-4 flex flex-wrap items-center gap-2">
	{#if data.igrejaFixa}
		<span class="font-medium text-marca-noite">{data.congregacoes[0]?.nome}</span>
	{:else}
		<select
			class="campo w-auto"
			aria-label="Filtrar por congregação"
			value={data.filtro}
			onchange={(e) => navegar(data.data, Number(e.currentTarget.value))}
		>
			<option value={0}>Todas as congregações</option>
			{#each data.congregacoes as c (c.id)}
				<option value={c.id}>{c.nome}</option>
			{/each}
		</select>
	{/if}
	<a
		class="btn btn-primario"
		href="/escala/pdf?data={data.data}{data.filtro ? `&cong=${data.filtro}` : ''}"
		target="_blank"
		rel="noreferrer"
		data-sveltekit-reload
	>
		Escala da semana em PDF
	</a>
	{#if admin}
		<a class="btn btn-secundario" href={linkWhatsApp(textoDoDia)} target="_blank" rel="noreferrer">
			Enviar escala do dia no WhatsApp
		</a>
	{/if}
</div>

{#if form && !form.cultoId}
	<div class="mt-4"><Aviso {form} /></div>
{/if}

<section class="mt-4 space-y-3">
	{#if data.cultos.length === 0}
		<p class="cartao text-sm text-gray-600">Nenhum culto previsto para {formatarData(data.data)}.</p>
	{/if}

	{#each data.cultos as c (c.id)}
		{@const escalados = c.escalas.filter((e) => e.autorizacao === 'autorizada' && e.funcao !== 'auxiliar')}
		<article class="cartao {c.cancelado ? 'opacity-60' : ''}">
			<div class="flex flex-wrap items-start justify-between gap-2">
				<div>
					<p class="text-xs font-medium tracking-wide text-marca-escuro uppercase">
						{horario(c.hora_inicio, c.hora_fim)} · {c.nome_evento||c.tipo}
					</p>
					<h2 class="font-semibold text-marca-noite">{c.congregacao} <span class="font-normal text-gray-500">– Área {c.area}</span></h2>
					<p class="text-sm text-gray-600">
						{c.ponto ? `Ponto de pregação: ${c.ponto}` : 'Templo da congregação'}
						{#if c.maps}· <a class="btn-link" href={c.maps} target="_blank" rel="noreferrer">mapa</a>{/if}
					</p>
				</div>
				<div class="flex items-center gap-2">
					{#if c.cancelado}
						<span class="selo bg-gray-200 text-gray-700">Cancelado</span>
					{:else if escalados.length === 0}
						<span class="selo bg-amber-100 text-amber-800">Sem escalado</span>
					{/if}
					{#if admin}
					<form method="POST" action={acao('cancelar')} use:enhance>
							<input type="hidden" name="culto_id" value={c.id} />
							<button class="btn-link cursor-pointer text-xs">{c.cancelado ? 'Reativar' : 'Cancelar culto'}</button>
						</form>
					{/if}
				</div>
			</div>

			<p class="mt-2 text-sm"><span class="text-gray-500">Tema indicado:</span> {c.tema || 'Livre'}</p>
			{#if c.observacao}<p class="text-sm text-gray-600">{c.observacao}</p>{/if}

			{#if form?.cultoId === c.id}
				<div class="mt-2"><Aviso {form} /></div>
			{/if}

			<ul class="mt-3 space-y-2">
				{#each c.escalas as e (e.id)}
					<li class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm">
						<div>
							<span class="font-medium">{nomeNaEscala(e)}</span>
							{#if e.funcao === 'titular'}
								<span class="selo ml-1 bg-demo-azul/10 text-demo-azul">Pb responsável · escalado da quarta</span>
							{:else if e.funcao === 'auxiliar'}
								<span class="selo ml-1 bg-gray-200 text-gray-700">Auxiliando o Pb</span>
							{:else if !cargoPermitido(c.tipo, e.cargo)}
								<span class="selo ml-1 bg-red-100 text-red-700">Cargo não permitido neste culto</span>
							{/if}
							{#if e.autorizacao === 'aguardando'}
								<span class="selo ml-1 bg-amber-100 text-amber-800">Aguardando autorização</span>
								<span class="block text-xs text-gray-500">Indicado por {e.indicado_por_nome}</span>
							{:else}
								<span class="selo ml-1 {RESPOSTAS[e.resposta].cor}">{RESPOSTAS[e.resposta].rotulo}</span>
								{#if e.justificativa}<span class="block text-xs text-red-700">Justificativa: {e.justificativa}</span>{/if}
							{/if}
						</div>
						<div class="flex flex-wrap items-center gap-2">
							{#if ehAdmin(data.user) && e.autorizacao === 'aguardando'}
								<a class="btn btn-secundario" href="/aprovacoes">Revisar aprovação</a>
							{/if}
							{#if admin && e.autorizacao === 'autorizada'}
								<a
									class="btn-link text-xs"
									href={linkWhatsApp(textoEscala(c, e), e.whatsapp)}
									target="_blank"
									rel="noreferrer">WhatsApp</a
								>
							{/if}
							{#if (data.montaEscala || c.podeEditar) && e.autorizacao === 'autorizada'}
								<form method="POST" action={acao('remover')} use:enhance>
									<input type="hidden" name="id" value={e.id} />
									<button class="btn-link cursor-pointer text-xs text-red-700">
										Retirar
									</button>
								</form>
							{/if}
						</div>
					</li>
				{:else}
					<li class="text-sm text-gray-500">Ninguém escalado ainda.</li>
				{/each}
			</ul>

			{#if c.avisoCargo && c.podeEscalar}
				<p class="mt-3 text-xs text-gray-600">{c.avisoCargo}</p>
			{/if}

			{#if c.podeEscalar}
				<form method="POST" action={acao('escalar')} use:enhance class="mt-3 flex flex-wrap gap-2">
					<input type="hidden" name="culto_id" value={c.id} />
					<select class="campo min-w-0 flex-1" name="usuario_id" required aria-label="Obreiro para {c.nome_evento||c.tipo} em {c.congregacao}">
						<option value="">Selecione o obreiro…</option>
						<optgroup label="Disponíveis">
							{#each c.candidatos.filter((o) => o.recomendado) as o (o.id)}
								<option value={o.id}>{o.rotulo}</option>
							{/each}
						</optgroup>

					</select>
					<button class="btn btn-primario">Escalar</button>
				</form>
			{/if}

			{#if c.podeEditar && !c.cancelado}
				<details class="mt-2 text-sm">
					<summary class="cursor-pointer text-marca-escuro">Editar tema / observação</summary>
					<form method="POST" action={acao('tema')} use:enhance class="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
						<input type="hidden" name="culto_id" value={c.id} />
						<input class="campo" name="tema" value={c.tema} placeholder="Tema (em branco = Livre)" aria-label="Tema indicado" />
						<input class="campo" name="observacao" value={c.observacao} placeholder="Observação" aria-label="Observação" />
						<button class="btn btn-secundario">Salvar</button>
					</form>
				</details>
			{/if}
		</article>
	{/each}
</section>
