<script lang="ts">
	import type { PageData } from './$types';
	import { orderStatusLabel, formatPln } from '$lib/formatting';

	let { data }: { data: PageData } = $props();
	const orders = $derived(data.orders);
	const activeStatus = $derived(data.activeStatus);

	const statusFilters = [
		{ value: null, label: 'Wszystkie' },
		{ value: 'PENDING_PAYMENT', label: 'Oczekuje na płatność' },
		{ value: 'PAID', label: 'Opłacone' },
		{ value: 'PRINTING', label: 'W druku' },
		{ value: 'PACKED', label: 'Spakowane' },
		{ value: 'SHIPPED', label: 'Wysłane' },
		{ value: 'DELIVERED', label: 'Dostarczone' },
		{ value: 'CANCELLED', label: 'Anulowane' },
		{ value: 'REFUNDED', label: 'Zwrócone' }
	] as const;

	const statusColors: Record<string, string> = {
		PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
		PAID: 'bg-green-100 text-green-800',
		PRINTING: 'bg-blue-100 text-blue-800',
		PACKED: 'bg-purple-100 text-purple-800',
		SHIPPED: 'bg-indigo-100 text-indigo-800',
		DELIVERED: 'bg-gray-100 text-gray-800',
		CANCELLED: 'bg-red-100 text-red-800',
		REFUNDED: 'bg-orange-100 text-orange-800'
	};
</script>

<svelte:head>
	<title>Admin — Zamówienia</title>
</svelte:head>

<h1 class="text-2xl font-bold text-gray-900 mb-4">Zamówienia</h1>

<!-- Status filter tabs -->
<div class="flex flex-wrap gap-2 mb-6">
	{#each statusFilters as f}
		<a
			href={f.value ? `?status=${f.value}` : '/admin/orders'}
			class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors {activeStatus === f.value
				? 'bg-gray-900 text-white'
				: 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}"
		>
			{f.label}
		</a>
	{/each}
</div>

{#if orders.length === 0}
	<p class="text-gray-500 text-sm">Brak zamówień.</p>
{:else}
	<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
		<table class="w-full text-sm">
			<thead class="bg-gray-50 border-b border-gray-200">
				<tr>
					<th class="text-left px-4 py-3 font-medium text-gray-600">ID</th>
					<th class="text-left px-4 py-3 font-medium text-gray-600">Email</th>
					<th class="text-left px-4 py-3 font-medium text-gray-600">Status</th>
					<th class="text-right px-4 py-3 font-medium text-gray-600">Kwota</th>
					<th class="text-left px-4 py-3 font-medium text-gray-600">Data</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100">
				{#each orders as o}
					<tr class="hover:bg-gray-50 cursor-pointer" onclick={() => (window.location.href = `/admin/orders/${o.id}`)}>
						<td class="px-4 py-3 font-mono text-xs text-gray-500">{o.id.slice(0, 8)}…</td>
						<td class="px-4 py-3 text-gray-900">{o.customer_email}</td>
						<td class="px-4 py-3">
							<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {statusColors[o.status] ?? ''}">
								{orderStatusLabel(o.status)}
							</span>
						</td>
						<td class="px-4 py-3 text-right font-medium text-gray-900">{formatPln(o.total_pln)}</td>
						<td class="px-4 py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString('pl-PL')}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
