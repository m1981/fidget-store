<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const batch = $derived(data.batch);
</script>

<svelte:head><title>Makers — Kolejka druku</title></svelte:head>

<h1 class="text-xl font-bold text-gray-900 mb-1">Kolejka druku</h1>

{#if batch.dropId}
	<p class="text-sm text-gray-500 mb-6">Drop #{batch.dropId}</p>
{/if}

{#if form && !form.ok}
	<p class="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{form.error}</p>
{/if}
{#if form?.ok && form?.packed}
	<p class="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
		Zamówienie spakowane!
	</p>
{/if}

{#if batch.items.length === 0}
	<div class="bg-white rounded-xl border border-gray-200 p-8 text-center">
		<p class="text-gray-500">Brak aktywnej kolejki druku.</p>
		<p class="text-sm text-gray-400 mt-1">Administrator musi zamknąć drop, aby wyświetlić zadania.</p>
	</div>
{:else}
	<div class="space-y-3">
		{#each batch.items as item}
			{@const remaining = item.totalUnits - item.printedUnits}
			{@const pct = item.totalUnits > 0 ? Math.round((item.printedUnits / item.totalUnits) * 100) : 0}
			<div class="bg-white rounded-xl border border-gray-200 p-4">
				<div class="flex items-center gap-3 mb-3">
					<!-- Filament colour swatch -->
					<div
						class="w-8 h-8 rounded-full border border-gray-200 flex-shrink-0"
						style="background-color: {item.hexCode}"
					></div>
					<div class="flex-1 min-w-0">
						<p class="font-semibold text-gray-900 truncate">{item.productName}</p>
						<p class="text-sm text-gray-500">{item.filamentColor}</p>
					</div>
					<div class="text-right">
						<p class="text-2xl font-bold text-gray-900">{remaining}</p>
						<p class="text-xs text-gray-400">pozostało</p>
					</div>
				</div>

				<!-- Progress bar -->
				<div class="w-full bg-gray-100 rounded-full h-2 mb-3">
					<div
						class="bg-green-500 h-2 rounded-full transition-all"
						style="width: {pct}%"
					></div>
				</div>
				<p class="text-xs text-gray-500 mb-3">{item.printedUnits} / {item.totalUnits} wydrukowano</p>

				<!-- Actions -->
				<div class="flex gap-2">
					<form method="POST" action="?/increment" class="flex-1">
						<input type="hidden" name="variant_id" value={item.variantId} />
						<button
							type="submit"
							disabled={remaining === 0}
							class="w-full py-3 rounded-lg font-bold text-lg transition-colors
								{remaining > 0
									? 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700'
									: 'bg-gray-100 text-gray-400 cursor-not-allowed'}"
						>
							[+1]
						</button>
					</form>
					<form method="POST" action="?/decrement">
						<input type="hidden" name="variant_id" value={item.variantId} />
						<button
							type="submit"
							class="px-4 py-3 rounded-lg font-bold text-lg bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors"
						>
							[-1]
						</button>
					</form>
				</div>
			</div>
		{/each}
	</div>
{/if}
