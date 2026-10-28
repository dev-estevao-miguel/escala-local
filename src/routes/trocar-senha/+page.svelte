<script lang="ts">
	import { enhance } from '$app/forms';
	import Rodape from '#lib/componentes/Rodape.svelte';
	import CampoSenha from '#lib/componentes/CampoSenha.svelte';
	import { SIGLA, abrevCargo } from '#lib/util';

	let { data, form } = $props();
	let enviando = $state(false);
</script>

<svelte:head>
	<title>Criar senha · Escala Local · {SIGLA}</title>
</svelte:head>

<div class="fundo-demo flex min-h-dvh flex-col">
	<div class="flex flex-1 flex-col items-center justify-center px-4 py-10">
		<div class="mb-6 text-center text-white">
			<img
				src="/marca-demo.png"
				alt="Logotipo da Igreja Demo"
				class="mx-auto size-28 rounded-2xl bg-white p-2 shadow-lg"
				width="112"
				height="112"
			/>
			<h1 class="mt-4 text-2xl font-semibold">Crie a sua senha pessoal</h1>
			<p class="mt-1 text-sm opacity-80">{abrevCargo(data.user!.cargo)} {data.user!.nome} · Carteira {data.user!.carteira}</p>
		</div>

		<form
			method="POST"
			class="cartao w-full max-w-sm space-y-4 border-t-4 border-demo-vermelho p-6"
			use:enhance={() => {
				enviando = true;
				return async ({ update }) => {
					await update();
					enviando = false;
				};
			}}
		>
			<p class="text-sm text-gray-600">
				Você entrou com uma senha temporária. Para continuar, crie uma senha só sua (mínimo de 8 caracteres). Ela será usada
				nos próximos acessos.
			</p>
			<div>
				<CampoSenha id="nova" name="nova" rotulo="Nova senha" minlength={8}/>
			</div>
			<div>
				<CampoSenha id="nova2" name="nova2" rotulo="Repita a nova senha" minlength={8}/>
			</div>

			{#if form?.erro}
				<p class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{form.erro}</p>
			{/if}

			<button class="btn btn-primario w-full py-2.5" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar e continuar'}</button>
		</form>

		<form method="POST" action="/sair" class="mt-4">
			<button class="cursor-pointer text-sm text-white/80 underline hover:text-white">Sair</button>
		</form>
	</div>

	<Rodape tom="claro" />
</div>
