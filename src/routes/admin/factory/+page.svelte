<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const settings = $derived(data.settings);
</script>

<svelte:head>
	<title>Admin — Drukarka</title>
</svelte:head>

<h1 class="text-2xl font-bold text-gray-900 mb-6">Factory Switch — status drukarki</h1>

<div class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
	<div class="flex items-center justify-between mb-4">
		<div>
			<p class="font-semibold text-gray-900">Drukarka</p>
			<p class="text-sm text-gray-500 mt-0.5">
				{settings.printer_is_on ? 'Sklep jest otwarty — klienci mogą zamawiać' : 'Sklep zamknięty — nowe zamówienia są blokowane'}
			</p>
		</div>
		<span
			class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {settings.printer_is_on
				? 'bg-green-100 text-green-800'
				: 'bg-red-100 text-red-800'}"
		>
			{settings.printer_is_on ? 'WŁĄCZONA' : 'WYŁĄCZONA'}
		</span>
	</div>

	<form method="POST" action="?/toggle">
		<input type="hidden" name="current" value={settings.printer_is_on} />
		<input type="hidden" name="message" value={settings.status_message} />
		<button
			type="submit"
			class="px-6 py-2 rounded-lg font-semibold text-sm transition-colors {settings.printer_is_on
				? 'bg-red-600 text-white hover:bg-red-700'
				: 'bg-green-600 text-white hover:bg-green-700'}"
		>
			{settings.printer_is_on ? 'Wyłącz drukarkę' : 'Włącz drukarkę'}
		</button>
	</form>
</div>

<div class="bg-white rounded-xl border border-gray-200 p-6">
	<h2 class="font-semibold text-gray-900 mb-4">Wiadomość dla klientów</h2>
	<p class="text-sm text-gray-500 mb-4">
		Wyświetlana na stronie głównej sklepu jako komunikat statusu.
	</p>

	{#if form?.error}
		<p class="mb-3 text-sm text-red-600">{form.error}</p>
	{/if}
	{#if form?.success}
		<p class="mb-3 text-sm text-green-600">Zapisano.</p>
	{/if}

	<form method="POST" action="?/updateMessage" class="flex gap-3">
		<input
			name="message"
			type="text"
			value={settings.status_message}
			placeholder="np. Przerwa techniczna do 18:00"
			maxlength="200"
			class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
		/>
		<button
			type="submit"
			class="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
		>
			Zapisz
		</button>
	</form>
</div>
