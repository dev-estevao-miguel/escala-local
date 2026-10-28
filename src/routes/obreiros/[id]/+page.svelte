<script lang="ts">
	import { enhance } from '$app/forms';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import CamposObreiro from '#lib/componentes/CamposObreiro.svelte';
	import GradeDisponibilidade from '#lib/componentes/GradeDisponibilidade.svelte';
	import {
		PERFIS,
		RESPOSTAS,
		STATUS_OBREIRO,
		abrevCargo,
		formatarData,
		formatarDataLonga,
		type Perfil,
		type Resposta
	} from '#lib/util';

	let { data, form } = $props();
	const o = $derived(data.obreiro);
	const admin = $derived(data.podeEditar);
	const congregacao = $derived(data.congregacoes.find((c) => c.id === o.congregacao_id)?.nome);
</script>

<a class="btn-link text-sm" href="/obreiros">‹ Obreiros</a>
<div class="mt-1 flex flex-wrap items-center gap-2">
	<h1 class="titulo">{abrevCargo(o.cargo)} – {o.nome}</h1>
	<span class="selo {STATUS_OBREIRO[o.status].cor}">{STATUS_OBREIRO[o.status].rotulo}</span>
</div>
<p class="mb-4 text-sm text-gray-600">
	Cadastrado em {formatarData(o.criado_em.slice(0, 10))}{o.cadastrado_por_nome ? ` por ${o.cadastrado_por_nome}` : ' pelo próprio obreiro'}{o.aprovado_por_nome
		? ` · aprovado por ${o.aprovado_por_nome}`
		: ''}
	{#if o.motivo_recusa && o.status === 'recusado'}<br />Motivo da recusa: {o.motivo_recusa}{/if}
</p>

{#if data.novo && !form}
	<p class="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
		Cadastro salvo{o.status === 'pendente' ? ' e enviado para autorização da coordenação' : ''}.
	</p>
{/if}
<Aviso {form} />
{#if data.podeStatus}<form method="POST" action="?/status" use:enhance class="cartao mb-4 flex flex-wrap gap-2"><select class="campo w-auto" name="status" aria-label="Situação do acesso" value={o.status}><option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="removido">Removido</option></select><button class="btn btn-secundario">Atualizar acesso</button></form>{/if}

<div class="grid gap-4 lg:grid-cols-[2fr_1fr]">
	{#if admin}
		<form method="POST" action="?/salvar" use:enhance class="cartao">
			<h2 class="mb-3 font-semibold text-marca-noite">Dados do obreiro</h2>
			<CamposObreiro valores={o} congregacoes={data.congregacoes} pedirCongregacao={!(['coordenador','vice'].includes(o.perfil))} perfil perfis={data.perfis} status />
			<button class="btn btn-primario mt-5">Salvar alterações</button>
		</form>
	{:else}
		<section class="cartao">
			<h2 class="mb-3 font-semibold text-marca-noite">Dados do obreiro</h2>
			<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
				<dt class="text-gray-500">Carteira:</dt>
				<dd>{o.carteira}</dd>
				<dt class="text-gray-500">Cargo:</dt>
				<dd>{o.cargo}</dd>
				<dt class="text-gray-500">Congregação:</dt>
				<dd>{congregacao}</dd>
				<dt class="text-gray-500">Perfil:</dt>
				<dd>{PERFIS[o.perfil as Perfil]}</dd>
				<dt class="text-gray-500">WhatsApp:</dt>
				<dd>{o.whatsapp || '—'}</dd>
			</dl>
			<h3 class="mt-4 mb-2 text-sm font-semibold">Disponibilidade</h3>
			<GradeDisponibilidade selecionados={o.disponibilidade} somenteLeitura />
		</section>
	{/if}

	<div class="space-y-4">
		<section class="cartao">
			<h2 class="mb-2 font-semibold text-marca-noite">Próximas escalas</h2>
			{#each data.escalas as e (e.id)}
				<a href="/escala?data={e.data}" class="block border-b border-gray-100 py-2 text-sm last:border-0 hover:bg-gray-50">
					<span class="font-medium">{formatarDataLonga(e.data)}</span>
					<span class="block text-gray-600">{e.tipo} · {e.congregacao}{e.ponto ? ` · ${e.ponto}` : ''}</span>
					{#if e.autorizacao === 'aguardando'}
						<span class="selo bg-amber-100 text-amber-800">Aguardando autorização</span>
					{:else}
						<span class="selo {RESPOSTAS[e.resposta as Resposta].cor}">{RESPOSTAS[e.resposta as Resposta].rotulo}</span>
					{/if}
				</a>
			{:else}
				<p class="text-sm text-gray-600">Nenhuma escala futura.</p>
			{/each}
		</section>

		<section class="cartao">
			<h2 class="mb-2 font-semibold text-marca-noite">Indisponibilidades</h2>
			{#each data.indisponibilidades as i (i.id)}
				<p class="text-sm">
					{formatarData(i.inicio)}{i.fim !== i.inicio ? ` a ${formatarData(i.fim)}` : ''}
					{#if i.motivo}<span class="text-gray-600">· {i.motivo}</span>{/if}
				</p>
			{:else}
				<p class="text-sm text-gray-600">Nenhuma informada.</p>
			{/each}
		</section>

		{#if admin}
			<form method="POST" action="?/redefinirSenha" use:enhance class="cartao space-y-2">
				<h2 class="font-semibold text-marca-noite">Redefinir senha</h2>
				<p class="text-sm text-gray-600">
					Gera uma senha temporária individual. No próximo acesso o obreiro deverá criar uma nova senha pessoal.
				</p>
				<button class="btn btn-secundario">Gerar senha temporária</button>
				{#if form?.senhaTemporaria}
					<div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
						<p class="font-semibold">Senha temporária do obreiro</p>
						<output class="my-2 block break-all font-mono text-base select-all" aria-label="Senha temporária">{form.senhaTemporaria}</output>
						<p>Copie e envie diretamente ao obreiro. Esta senha não será exibida novamente após sair da página.</p>
					</div>
				{/if}
			</form>
		{/if}
	</div>
</div>
