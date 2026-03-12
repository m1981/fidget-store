<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Admin — Nowy drop</title>
</svelte:head>

<div class="mb-4">
	<a href="/admin/drops" class="text-sm text-blue-600 hover:underline">← Wszystkie dropy</a>
</div>

<h1 class="text-2xl font-bold text-gray-900 mb-6">Nowy drop</h1>

<div class="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
	{#if form?.error}
		<p class="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{form.error}</p>
	{/if}

	<form method="POST" class="space-y-4">
		<div>
			<label for="opens_at" class="block text-sm font-medium text-gray-700 mb-1">Otwiera się</label>
			<input
				id="opens_at"
				name="opens_at"
				type="datetime-local"
				required
				class="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
		</div>
		<div>
			<label for="closes_at" class="block text-sm font-medium text-gray-700 mb-1">Zamyka się</label>
			<input
				id="closes_at"
				name="closes_at"
				type="datetime-local"
				required
				class="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
		</div>
		<div>
			<label for="total_capacity_minutes" class="block text-sm font-medium text-gray-700 mb-1">
				Pojemność (minuty produkcji)
			</label>
			<input
				id="total_capacity_minutes"
				name="total_capacity_minutes"
				type="number"
				min="1"
				step="1"
				placeholder="np. 600"
				required
				class="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
			<p class="text-xs text-gray-500 mt-1">Całkowita ilość minut druku dostępna w tym dropie</p>
		</div>
		<div class="flex gap-3 pt-2">
			<button
				type="submit"
				class="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
			>
				Utwórz drop
			</button>
			<a
				href="/admin/drops"
				class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
			>
				Anuluj
			</a>
		</div>
	</form>
</div>
