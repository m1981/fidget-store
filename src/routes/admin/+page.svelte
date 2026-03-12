<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const stats = $derived(data.stats);
</script>

<svelte:head>
	<title>Admin — Dashboard</title>
</svelte:head>

<h1 class="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

<div class="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
	<div class="bg-white rounded-xl border border-gray-200 p-5">
		<p class="text-sm text-gray-500">Wszystkie zamówienia</p>
		<p class="text-3xl font-bold text-gray-900 mt-1">{stats.totalOrders}</p>
	</div>
	<div class="bg-white rounded-xl border border-gray-200 p-5">
		<p class="text-sm text-gray-500">Oczekuje na płatność</p>
		<p class="text-3xl font-bold text-yellow-600 mt-1">{stats.pendingOrders}</p>
	</div>
	<div class="bg-white rounded-xl border border-gray-200 p-5">
		<p class="text-sm text-gray-500">Opłacone</p>
		<p class="text-3xl font-bold text-green-600 mt-1">{stats.paidOrders}</p>
	</div>
	<div class="bg-white rounded-xl border border-gray-200 p-5">
		<p class="text-sm text-gray-500">Pojemność dropu</p>
		{#if stats.activeDropCapacityPct !== null}
			<p class="text-3xl font-bold text-blue-600 mt-1">{stats.activeDropCapacityPct}%</p>
		{:else}
			<p class="text-3xl font-bold text-gray-400 mt-1">—</p>
		{/if}
	</div>
</div>

<div class="flex gap-4">
	<a
		href="/admin/factory"
		class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
	>
		Zarządzaj drukarką
	</a>
	<a
		href="/admin/orders"
		class="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
	>
		Przeglądaj zamówienia
	</a>
</div>
