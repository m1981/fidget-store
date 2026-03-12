<script lang="ts">
	import PrinterStatus from '$lib/components/PrinterStatus.svelte';
	import DropCountdown from '$lib/components/DropCountdown.svelte';
	import ScarcityBadge from '$lib/components/ScarcityBadge.svelte';
	import { formatPln, formatMinutes } from '$lib/formatting';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const remaining = $derived(
		data.activeDrop
			? data.activeDrop.total_capacity_minutes - data.activeDrop.allocated_minutes
			: 0
	);
</script>

<svelte:head>
	<title>Fidget Fun! — Weekly Drop</title>
</svelte:head>

<!-- Printer status -->
<PrinterStatus
	isOn={data.settings.printer_is_on}
	message={data.settings.status_message}
	estimatedDays={data.settings.active_window_end_hour - data.settings.active_window_start_hour}
/>

<!-- Drop info -->
{#if data.activeDrop}
	<div class="mt-6 mb-8">
		<div class="flex items-center justify-between mb-2">
			<h1 class="text-xl font-bold text-slate-100">Weekly Drop</h1>
			<ScarcityBadge remainingMinutes={remaining} />
		</div>
		<DropCountdown closesAt={new Date(data.activeDrop.closes_at)} />
	</div>
{:else}
	<div class="mt-8 text-center py-12 border border-dashed border-slate-700 rounded-lg">
		<p class="text-slate-400 text-sm">Brak aktywnego dropu.</p>
		<p class="text-slate-600 text-xs mt-1">Wróć wkrótce — ogłaszamy nowy drop co tydzień!</p>
	</div>
{/if}

<!-- Product grid -->
{#if data.products.length > 0}
	<div class="grid gap-4">
		{#each data.products as { product, variants }}
			<a
				href="/products/{product.id}"
				class="block bg-slate-900 border border-slate-700 rounded-xl p-4 hover:border-cyan-600 transition-colors group"
			>
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1 min-w-0">
						<h2 class="font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
							{product.name}
						</h2>
						{#if product.description}
							<p class="text-slate-400 text-sm mt-1 line-clamp-2">{product.description}</p>
						{/if}

						<!-- Colour swatches preview -->
						<div class="flex gap-1.5 mt-3">
							{#each variants.slice(0, 8) as variant}
								<span
									class="w-5 h-5 rounded-full border-2 border-slate-700 flex-shrink-0"
									style="background-color: {variant.hex_code}"
									title={variant.filament_color}
								></span>
							{/each}
							{#if variants.length > 8}
								<span class="text-slate-500 text-xs self-center">+{variants.length - 8}</span>
							{/if}
						</div>
					</div>

					<div class="text-right flex-shrink-0">
						<p class="text-cyan-400 font-bold text-lg">{formatPln(product.price_pln)}</p>
						<p class="text-slate-500 text-xs mt-0.5">{formatMinutes(product.print_duration_minutes)}</p>
					</div>
				</div>
			</a>
		{/each}
	</div>
{:else if data.activeDrop}
	<p class="text-slate-500 text-sm text-center py-8">Ładowanie produktów…</p>
{/if}

<!-- Story section -->
<div class="mt-12 border-t border-slate-800 pt-8">
	<h2 class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Kim jesteśmy</h2>
	<div class="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-2">
		<p class="text-slate-300 text-sm">
			Jesteśmy Leo (12 lat) i Sam (10 lat). Drukujemy zabawki fidget na naszej drukarce 3D.
		</p>
		<p class="text-slate-400 text-sm">
			Każdy produkt drukujemy ręcznie — ile zmieści się w danym tygodniu, tyle wychodzi. Nasz
			Wujek Mike pomaga z wysyłką.
		</p>
		<p class="text-cyan-500 text-xs font-medium">🔧 Prawdziwi ludzie. Prawdziwy druk. Bez bullshitu.</p>
	</div>
</div>
