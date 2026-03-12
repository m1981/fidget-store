<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { orderStatusLabel, formatPln } from '$lib/formatting';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const orderData = $derived(data.orderData);
	const o = $derived(orderData.order);
	const items = $derived(orderData.items);

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

	const canShip = $derived(o.status === 'PACKED');
	const canRefund = $derived(['PAID', 'PRINTING', 'PACKED'].includes(o.status));
</script>

<svelte:head>
	<title>Admin — Zamówienie {o.id.slice(0, 8)}</title>
</svelte:head>

<div class="mb-4">
	<a href="/admin/orders" class="text-sm text-blue-600 hover:underline">← Wszystkie zamówienia</a>
</div>

<div class="flex items-start justify-between mb-6">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Zamówienie</h1>
		<p class="font-mono text-sm text-gray-500 mt-0.5">{o.id}</p>
	</div>
	<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {statusColors[o.status] ?? ''}">
		{orderStatusLabel(o.status)}
	</span>
</div>

{#if form?.error}
	<p class="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{form.error}</p>
{/if}
{#if form?.success}
	<p class="mb-4 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2">Zapisano pomyślnie.</p>
{/if}

<!-- Customer Info -->
<div class="bg-white rounded-xl border border-gray-200 p-5 mb-4">
	<h2 class="font-semibold text-gray-900 mb-3">Dane klienta</h2>
	<dl class="grid grid-cols-2 gap-3 text-sm">
		<div><dt class="text-gray-500">Email</dt><dd class="font-medium">{o.customer_email}</dd></div>
		<div><dt class="text-gray-500">Telefon</dt><dd class="font-medium">{o.customer_phone}</dd></div>
		<div><dt class="text-gray-500">Paczkomat</dt><dd class="font-medium">{o.inpost_point_id}</dd></div>
		<div><dt class="text-gray-500">Kwota</dt><dd class="font-medium">{formatPln(o.total_pln)}</dd></div>
		{#if o.tracking_number}
			<div><dt class="text-gray-500">Nr listu</dt><dd class="font-medium font-mono">{o.tracking_number}</dd></div>
		{/if}
		{#if o.payment_gateway_id}
			<div><dt class="text-gray-500">ID płatności</dt><dd class="font-medium font-mono text-xs">{o.payment_gateway_id}</dd></div>
		{/if}
	</dl>
</div>

<!-- Order Items -->
<div class="bg-white rounded-xl border border-gray-200 p-5 mb-4">
	<h2 class="font-semibold text-gray-900 mb-3">Produkty</h2>
	<ul class="divide-y divide-gray-100">
		{#each items as { item, variant, product }}
			<li class="py-2 flex items-center justify-between text-sm">
				<span>
					<span class="font-medium">{product.name}</span>
					<span class="text-gray-500 ml-2">— {variant.filament_color}</span>
				</span>
				<span class="text-gray-700">×{item.quantity}</span>
			</li>
		{/each}
	</ul>
</div>

<!-- Actions -->
<div class="flex flex-wrap gap-3">
	{#if canShip}
		<form method="POST" action="?/ship" class="flex gap-2">
			<input
				name="tracking_number"
				type="text"
				placeholder="Nr listu przewozowego"
				required
				class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
			<button
				type="submit"
				class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
			>
				Oznacz jako wysłane
			</button>
		</form>
	{/if}

	{#if canRefund}
		<form method="POST" action="?/refund"
			onsubmit={(e) => { if (!confirm('Zwrócić to zamówienie i przywrócić pojemność?')) e.preventDefault(); }}>
			<button
				type="submit"
				class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
			>
				Zwróć zamówienie
			</button>
		</form>
	{/if}
</div>
