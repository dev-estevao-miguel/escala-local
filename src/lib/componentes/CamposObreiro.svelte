<script lang="ts">
	import { CARGOS, PERFIS, STATUS_OBREIRO, type Perfil } from '#lib/util';
	import GradeDisponibilidade from './GradeDisponibilidade.svelte';
	import CampoSenha from './CampoSenha.svelte';

	interface Valores {
		nascimento?: string;
		nome?: string;
		carteira?: string;
		cargo?: string;
		congregacao_id?: number | null;
		whatsapp?: string;
		perfil?: string;
		funcao?: string;
		status?: string;
		disponibilidade?: string[];
	}

	let {
		valores = {},
		congregacoes,
		congregacaoFixa = null,
		senha = false,
		perfil = false,
		funcaoCoordenacao = false,
		perfilCadastro,
		perfis = [],
		status = false
		, cargosPermitidos = CARGOS.map(c=>c.nome), pedirCongregacao = true
	}: {
		valores?: Valores;
		congregacoes: { id: number; codigo: string; nome: string }[];
		/** Quando definido, a congregação não pode ser trocada (cadastro feito pelo Pb). */
		congregacaoFixa?: number | null;
		senha?: boolean;
		perfil?: boolean;
		funcaoCoordenacao?: boolean;
		/** Aplica a apresentação da disponibilidade somente no cadastro por convite. */
		perfilCadastro?: Perfil;
		/** Perfis que quem está cadastrando pode atribuir. */
		perfis?: Perfil[];
		status?: boolean;
		cargosPermitidos?: string[];
		pedirCongregacao?: boolean;
	} = $props();

	// O perfil atual sempre aparece, mesmo que não possa ser atribuído por quem está editando.
	const opcoesPerfil = $derived([
		...new Set([...(valores.perfil ? [valores.perfil as Perfil] : []), ...perfis])
	]);
	let cargoSelecionado = $derived(valores.cargo ?? '');
	const mostrarDisponibilidade = $derived(!perfilCadastro || (
		!['coordenador', 'vice'].includes(perfilCadastro) && cargoSelecionado !== 'Presbítero'
	));
</script>

<div class="grid gap-4 sm:grid-cols-2">
	<div class="sm:col-span-2">
		<label class="rotulo" for="nome">Nome completo</label>
		<input class="campo" id="nome" name="nome" required minlength="3" value={valores.nome ?? ''} />
	</div>
	<div>
		<label class="rotulo" for="carteira">Nº da carteira de membro</label>
		<input class="campo" id="carteira" name="carteira" required inputmode="numeric" value={valores.carteira ?? ''} />
	</div>
	<div>
		<label class="rotulo" for="nascimento">Data de nascimento</label>
		<input class="campo" id="nascimento" name="nascimento" type="date" required={!status} min="1900-01-01" value={valores.nascimento ?? ''} autocomplete="bday" />
	</div>
	<div>
		<label class="rotulo" for="cargo">Cargo</label>
		<select class="campo" id="cargo" name="cargo" required bind:value={cargoSelecionado}>
			<option value="" disabled>Selecione…</option>
			{#each CARGOS.filter(c=>cargosPermitidos.includes(c.nome)) as c (c.nome)}
				<option value={c.nome}>{c.nome}</option>
			{/each}
		</select>
	</div>
	{#if funcaoCoordenacao}
		<div>
			<label class="rotulo" for="funcao">Função</label>
			<select class="campo" id="funcao" name="funcao" required value={valores.funcao ?? 'coordenador'}>
				<option value="coordenador">Coordenador</option>
				<option value="vice">Vice-Coordenador</option>
			</select>
		</div>
	{/if}
	{#if pedirCongregacao}<div>
		<label class="rotulo" for="congregacao_id">Congregação</label>
		{#if congregacaoFixa}
			<input type="hidden" name="congregacao_id" value={congregacaoFixa} />
			<input class="campo" id="congregacao_id" disabled value={congregacoes.find((c) => c.id === congregacaoFixa)?.nome} />
		{:else}
			<select class="campo" id="congregacao_id" name="congregacao_id" required value={valores.congregacao_id ?? ''}>
				<option value="" disabled>Selecione…</option>
				{#each congregacoes as c (c.id)}
					<option value={c.id}>{c.codigo} · {c.nome}</option>
				{/each}
			</select>
		{/if}
	</div>{/if}
	<div>
		<label class="rotulo" for="whatsapp">WhatsApp</label>
		<input class="campo" id="whatsapp" name="whatsapp" type="tel" required autocomplete="tel" placeholder="(81) 9 9999-9999" value={valores.whatsapp ?? ''} />
	</div>

	{#if perfil}
		<div>
			<label class="rotulo" for="perfil">Perfil de acesso</label>
			<select class="campo" id="perfil" name="perfil" value={valores.perfil ?? 'obreiro'}>
				{#each opcoesPerfil as id (id)}
					<option value={id}>{PERFIS[id]}</option>
				{/each}
			</select>
		</div>
	{/if}
	{#if status}
		<div>
			<label class="rotulo" for="status">Situação</label>
			<select class="campo" id="status" name="status" value={valores.status ?? 'ativo'}>
				{#each Object.entries(STATUS_OBREIRO) as [id, s] (id)}
					<option value={id}>{s.rotulo}</option>
				{/each}
			</select>
		</div>
	{/if}

	{#if senha}
		<div>
			<CampoSenha id="senha" name="senha" rotulo="Senha" minlength={8}/>
		</div>
		<div>
			<CampoSenha id="senha2" name="senha2" rotulo="Repita a senha" minlength={8}/>
		</div>
	{/if}

	{#if mostrarDisponibilidade}<fieldset class="sm:col-span-2">
		<legend class="rotulo">Disponibilidade para ser escalado</legend>
		<GradeDisponibilidade selecionados={valores.disponibilidade ?? []} />
		<p class="mt-2 text-sm text-gray-600">O sistema só irá lhe escalar nos dias selecionados como disponível.</p>
	</fieldset>{/if}
</div>
