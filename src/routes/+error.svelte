<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="mx-auto max-w-md px-4 py-16 text-center">
	<p class="text-5xl font-semibold text-marca-escuro">{page.status}</p>
	<p class="mt-2 text-gray-700">{page.error?.message ?? 'Algo deu errado.'}</p>
	<a class="btn btn-primario mt-6" href="/">Voltar ao início</a>
</div>
