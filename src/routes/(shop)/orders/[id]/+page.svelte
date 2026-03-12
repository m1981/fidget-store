<script lang="ts">
	import { formatPln, orderStatusLabel } from '$lib/formatting';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const order = $derived(data.orderData.order);
	const items = $derived(data.orderData.items);

	const statusConfig: Record<string, { icon: string; color: string; description: string }> = {
		PENDING_PAYMENT: {
			icon: '⏳',
			color: 'text-amber-300',
			description: 'Czekamy na potwierdzenie płatności BLIK.'
		},
		PAID: {
			icon: '✅',
			color: 'text-emerald-400',
			description: 'Płatność potwierdzona. Drop wkrótce się zamknie i ruszamy z drukowaniem!'
		},
		PRINTING: {
			icon: '🖨️',
			color: 'text-cyan-400',
			description: 'Twój produkt jest właśnie drukowany przez Leo lub Sama!'
		},
		PACKED: {
			icon: '📦',
			color: 'text-blue-400',
			description: 'Zapakowane i gotowe do wysyłki. Wujek Mike generuje etykietę!'
		},
		SHIPPED: {
			icon: '🚀',
			color: 'text-violet-400',
			description: 'Paczka jest w drodze! Sprawdź status w aplikacji InPost.'
		},
		DELIVERED: {
			icon: '🎉',
			color: 'text-emerald-400',
			description: 'Paczka dostarczona. Miłej zabawy!'
		},
		CANCELLED: {
			icon: '❌',
			color: 'text-red-400',
			description: 'Zamówienie anulowane (upłynął czas płatności BLIK).'
		},
		REFUNDED: {
			icon: '↩️',
			color: 'text-slate-400',
			description: 'Zwrot środków został zainicjowany.'
		}
	};

	const config = $derived(statusConfig[order.status] ?? { icon: '?', color: 'text-slate-400', description: '' });
</script>

<svelte:head>
	<title>Zamówienie #{order.id.slice(0, 8)} — Fidget Fun!</title>
</svelte:head>

<a href="/" class="text-slate-500 hover:text-cyan-400 text-sm flex items-center gap-1 mb-6">
	← Strona główna
</a>

<div class="space-y-6">
	<!-- Status card -->
	<div class="bg-slate-900 border border-slate-700 rounded-xl p-6 text-center">
		<p class="text-4xl mb-3">{config.icon}</p>
		<p class={`text-xl font-bold ${config.color}`}>{orderStatusLabel(order.status)}</p>
		{#if config.description}
			<p class="text-slate-400 text-sm mt-2">{config.description}</p>
		{/if}

		{#if order.tracking_number}
			<a
				href="https://inpost.pl/sledzenie-przesylek?number={order.tracking_number}"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-block mt-4 text-cyan-400 text-sm hover:underline"
			>
				Śledź paczkę: {order.tracking_number} →
			</a>
		{/if}
	</div>

	<!-- Order details -->
	<div class="bg-slate-900 border border-slate-700 rounded-xl divide-y divide-slate-800">
		<div class="p-4">
			<p class="text-xs text-slate-500 uppercase tracking-wide mb-1">Zamówienie</p>
			<p class="text-slate-300 font-mono text-sm">{order.id}</p>
		</div>
		<div class="p-4">
			<p class="text-xs text-slate-500 uppercase tracking-wide mb-1">Paczkomat</p>
			<p class="text-slate-300 text-sm">{order.inpost_point_id}</p>
		</div>
	</div>

	<!-- Order items -->
	<div>
		<h2 class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Produkty</h2>
		<div class="bg-slate-900 border border-slate-700 rounded-xl divide-y divide-slate-800">
			{#each items as { item, variant, product }}
				<div class="p-4 flex items-center gap-3">
					<span
						class="w-6 h-6 rounded-full flex-shrink-0 border border-slate-600"
						style="background-color: {variant.hex_code}"
					></span>
					<div class="flex-1 min-w-0">
						<p class="text-slate-200 text-sm">{product.name}</p>
						<p class="text-slate-500 text-xs">
							{variant.is_mystery ? 'Mystery Box' : variant.filament_color} × {item.quantity}
						</p>
					</div>
					<div class="text-right">
						<p class="text-slate-300 text-sm">{formatPln(product.price_pln * item.quantity)}</p>
						{#if item.status === 'PRINTED'}
							<p class="text-emerald-500 text-xs">✓ Wydrukowano</p>
						{:else if order.status === 'PRINTING'}
							<p class="text-cyan-400 text-xs">Drukowanie…</p>
						{/if}
					</div>
				</div>
			{/each}
			<div class="p-4 flex justify-between items-center">
				<span class="text-slate-400 text-sm">Razem</span>
				<span class="text-cyan-400 font-bold">{formatPln(order.total_pln)}</span>
			</div>
		</div>
	</div>
</div>
