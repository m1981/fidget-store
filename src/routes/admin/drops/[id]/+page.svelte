<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const d = $derived(data.drop);
	const dropProducts = $derived(data.dropProducts);
	const allProducts = $derived(data.allProducts);

	const assignedIds = $derived(new Set(dropProducts.map((p) => p.product.id)));

	function toLocalDatetimeInput(date: Date | string): string {
		const d = new Date(date);
		const pad = (n: number) => n.toString().padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	const statusLabels: Record<string, string> = { DRAFT: 'Szkic', ACTIVE: 'Aktywny', CLOSED: 'Zamknięty' };
	const statusColors: Record<string, string> = {
		DRAFT: 'bg-gray-100 text-gray-700',
		ACTIVE: 'bg-green-100 text-green-800',
		CLOSED: 'bg-blue-100 text-blue-800'
	};
</script>

<svelte:head>
	<title>Admin — Drop #{d.id}</title>
</svelte:head>

<div class="mb-4">
	<a href="/admin/drops" class="text-sm text-blue-600 hover:underline">← Wszystkie dropy</a>
</div>

<div class="flex items-center gap-4 mb-6">
	<h1 class="text-2xl font-bold text-gray-900">Drop #{d.id}</h1>
	<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {statusColors[d.status] ?? ''}">
		{statusLabels[d.status] ?? d.status}
	</span>
</div>

{#if form?.error}
	<p class="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{form.error}</p>
{/if}
{#if form?.success}
	<p class="mb-4 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2">Zapisano pomyślnie.</p>
{/if}

<!-- Edit form (only for DRAFT) -->
{#if d.status === 'DRAFT'}
	<div class="bg-white rounded-xl border border-gray-200 p-6 mb-4">
		<h2 class="font-semibold text-gray-900 mb-4">Edytuj drop</h2>
		<form method="POST" action="?/update" class="space-y-4 max-w-lg">
			<div>
				<label for="opens_at" class="block text-sm font-medium text-gray-700 mb-1">Otwiera się</label>
				<input
					id="opens_at"
					name="opens_at"
					type="datetime-local"
					value={toLocalDatetimeInput(d.opens_at)}
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
					value={toLocalDatetimeInput(d.closes_at)}
					required
					class="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			<div>
				<label for="total_capacity_minutes" class="block text-sm font-medium text-gray-700 mb-1">Pojemność (min)</label>
				<input
					id="total_capacity_minutes"
					name="total_capacity_minutes"
					type="number"
					min="1"
					value={d.total_capacity_minutes}
					required
					class="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			<button type="submit" class="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700">
				Zapisz zmiany
			</button>
		</form>
	</div>
{:else}
	<div class="bg-white rounded-xl border border-gray-200 p-5 mb-4 text-sm text-gray-700">
		<dl class="grid grid-cols-2 gap-3">
			<div><dt class="text-gray-500">Otwiera się</dt><dd>{new Date(d.opens_at).toLocaleString('pl-PL')}</dd></div>
			<div><dt class="text-gray-500">Zamyka się</dt><dd>{new Date(d.closes_at).toLocaleString('pl-PL')}</dd></div>
			<div><dt class="text-gray-500">Pojemność</dt><dd>{d.total_capacity_minutes} min</dd></div>
			<div><dt class="text-gray-500">Użyte</dt><dd>{d.allocated_minutes} min ({d.total_capacity_minutes > 0 ? Math.round(d.allocated_minutes / d.total_capacity_minutes * 100) : 0}%)</dd></div>
		</dl>
	</div>
{/if}

<!-- Assign products -->
<div class="bg-white rounded-xl border border-gray-200 p-6 mb-4">
	<h2 class="font-semibold text-gray-900 mb-4">Produkty w dropie</h2>
	{#if allProducts.length === 0}
		<p class="text-sm text-gray-500">Brak aktywnych produktów w katalogu.</p>
	{:else}
		<form method="POST" action="?/assignProducts">
			<div class="grid grid-cols-2 gap-2 mb-4">
				{#each allProducts as p}
					<label class="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
						<input
							type="checkbox"
							name="product_ids"
							value={p.id}
							checked={assignedIds.has(p.id)}
							class="rounded border-gray-300"
						/>
						<span>{p.name}</span>
					</label>
				{/each}
			</div>
			<button type="submit" class="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700">
				Zapisz produkty
			</button>
		</form>
	{/if}
</div>

<!-- Status actions -->
<div class="flex gap-3">
	{#if d.status === 'DRAFT'}
		<form method="POST" action="?/publish">
			<button
				type="submit"
				class="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
			>
				Opublikuj drop
			</button>
		</form>
	{/if}
	{#if d.status === 'ACTIVE'}
		<form method="POST" action="?/close"
			onsubmit={(e) => { if (!confirm('Zamknąć drop? Klienci nie będą mogli składać nowych zamówień.')) e.preventDefault(); }}>
			<button
				type="submit"
				class="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
			>
				Zamknij drop
			</button>
		</form>
	{/if}
</div>
