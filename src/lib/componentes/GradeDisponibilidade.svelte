<script lang="ts">
	import { DIAS_CURTOS, ORDEM_SEMANA, TURNOS } from '#lib/util';

	let { selecionados = [], somenteLeitura = false }: { selecionados?: string[]; somenteLeitura?: boolean } =
		$props();
</script>

<div class="overflow-x-auto">
	<table class="w-full min-w-88 table-fixed text-center text-sm">
		<thead>
			<tr>
				<th class="w-16"></th>
				{#each ORDEM_SEMANA as d (d)}
					<th class="px-0.5 pb-1 font-medium text-gray-600">{DIAS_CURTOS[d]}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each TURNOS as t (t.id)}
				<tr>
					<th class="pr-1 text-left font-medium text-gray-600">{t.nome}</th>
					{#each ORDEM_SEMANA as d (d)}
						<td class="p-0.5">
							<label
								class="flex items-center justify-center rounded-md border border-gray-200 py-2 has-checked:border-marca has-checked:bg-marca/15 {somenteLeitura
									? ''
									: 'cursor-pointer hover:bg-gray-50'}"
							>
								<input
									type="checkbox"
									name="disp"
									value="{d}-{t.id}"
									checked={selecionados.includes(`${d}-${t.id}`)}
									disabled={somenteLeitura}
									class="size-4 accent-marca"
									aria-label="{DIAS_CURTOS[d]} – {t.nome}"
								/>
							</label>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
<p class="mt-1 text-xs text-gray-500">Marque os dias e turnos em que você pode ser escalado.</p>
