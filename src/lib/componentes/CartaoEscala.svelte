<script lang="ts">
	import type { Snippet } from 'svelte';
	import {
		DIAS_SEMANA,
		RESPOSTAS,
		nomeNaEscala,
		diaSemana,
		formatarData,
		horario,
		localDoCulto,
		type DadosEscala,
		type Funcao,
		type Resposta
	} from '#lib/util';

	let {
		escala,
		escalado,
		acoes
	}: {
		escala: DadosEscala & {
			resposta: Resposta;
			funcao?: Funcao;
			justificativa?: string | null;
			endereco?: string;
			maps?: string;
		};
		escalado: { nome: string; cargo: string };
		acoes?: Snippet;
	} = $props();

	const borda = { pendente: 'border-amber-400', confirmado: 'border-green-500', justificado: 'border-red-500' };
</script>

<article class="cartao schedule-card">
	<div class="schedule-card-header">
		<div class="date-tile"><span>{DIAS_SEMANA[diaSemana(escala.data)].slice(0,3)}</span><b>{escala.data.slice(8)}</b><span>{formatarData(escala.data).slice(3)}</span></div>
		<div class="min-w-0 flex-1"><p class="text-xs font-bold uppercase tracking-wide text-marca">{horario(escala.hora_inicio,escala.hora_fim)} · {escala.tipo}</p><h3 class="mt-1 font-semibold text-marca-noite">{escala.congregacao}</h3><span class="selo mt-2 {RESPOSTAS[escala.resposta].cor}">{RESPOSTAS[escala.resposta].rotulo}</span></div>
	</div>
	<div class="schedule-card-body"><dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
		<dt class="text-gray-500">Horário:</dt>
		<dd>{horario(escala.hora_inicio, escala.hora_fim)}</dd>
		<dt class="text-gray-500">Igreja:</dt>
		<dd>{escala.congregacao} – Área {escala.area}</dd>
		<dt class="text-gray-500">Localização:</dt>
		<dd>
			{localDoCulto(escala)}
			{#if escala.endereco}
				<span class="block text-xs text-gray-500">
					{escala.endereco}
					{#if escala.maps}
						· <a class="btn-link" href={escala.maps} target="_blank" rel="noreferrer">abrir no mapa</a>
					{/if}
				</span>
			{/if}
		</dd>
		<dt class="text-gray-500">Culto:</dt>
		<dd>{escala.tipo}</dd>
		<dt class="text-gray-500">Tema indicado:</dt>
		<dd>{escala.tema || 'Livre'}</dd>
		<dt class="text-gray-500">Escalado:</dt>
		<dd class="font-medium">{nomeNaEscala(escalado)}</dd>
		{#if escala.funcao === 'titular'}
			<dt class="text-gray-500">Função:</dt>
			<dd>Pb responsável (escalado das quartas-feiras)</dd>
		{:else if escala.funcao === 'auxiliar'}
			<dt class="text-gray-500">Função:</dt>
			<dd>Auxiliando o Pb responsável</dd>
		{/if}
	</dl>
	{#if escala.resposta === 'justificado' && escala.justificativa}
		<p class="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Justificativa: {escala.justificativa}</p>
	{/if}
	</div>
	{#if acoes}
		<div class="schedule-card-actions">{@render acoes()}</div>
	{/if}
</article>
