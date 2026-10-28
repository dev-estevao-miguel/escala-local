<script lang="ts">
	let { form }: { form: { erro?: string; ok?: string } | null | undefined } = $props();
</script>

{#if form?.erro}
	<p class="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{form.erro}</p>
{:else if form?.ok}
	<p class="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800" role="status">{form.ok}</p>
{/if}
