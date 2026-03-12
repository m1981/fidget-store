<script lang="ts">
	import ColorSwatch from '$lib/components/ColorSwatch.svelte';
	import ScarcityBadge from '$lib/components/ScarcityBadge.svelte';
	import { formatPln, formatMinutes } from '$lib/formatting';
	import { addToCart } from '$lib/cart.svelte';
	import type { PageData } from './$types';
	import type { ProductVariant } from '$lib/server/db/schema';

	let { data }: { data: PageData } = $props();

	const product = $derived(data.productData.product);
	const variants = $derived(data.productData.variants);

	// Filter to normal variants and the mystery variant separately
	const regularVariants = $derived(variants.filter((v) => !v.is_mystery));
	const mysteryVariant = $derived(variants.find((v) => v.is_mystery));

	let selectedVariant = $state<ProductVariant | null>(null);
	// Initialise to first regular variant once data is available
	$effect(() => {
		if (selectedVariant === null && regularVariants.length > 0) {
			selectedVariant = regularVariants[0];
		}
	});

	const canAdd = $derived(
		data.settings.printer_is_on &&
			data.activeDrop !== null &&
			data.activeDrop.status === 'ACTIVE' &&
			selectedVariant !== null
	);

	const remaining = $derived(
		data.activeDrop
			? data.activeDrop.total_capacity_minutes - data.activeDrop.allocated_minutes
			: 0
	);

	function handleAddToCart() {
		if (!selectedVariant || !canAdd) return;
		addToCart({
			variantId: selectedVariant.id,
			productId: product.id,
			productName: product.name,
			filamentColor: selectedVariant.filament_color,
			hexCode: selectedVariant.hex_code,
			pricePln: product.price_pln,
			printDurationMinutes: product.print_duration_minutes,
			isMystery: false
		});
		// Navigate to checkout
		window.location.href = '/checkout';
	}

	function handleMysteryBox() {
		if (!mysteryVariant || !canAdd) return;
		addToCart({
			variantId: mysteryVariant.id,
			productId: product.id,
			productName: `${product.name} — Mystery Box`,
			filamentColor: 'Niespodzianka',
			hexCode: '#6366f1',
			pricePln: product.price_pln,
			printDurationMinutes: product.print_duration_minutes,
			isMystery: true
		});
		window.location.href = '/checkout';
	}
</script>

<svelte:head>
	<title>{product.name} — Fidget Fun!</title>
</svelte:head>

<a href="/" class="text-slate-500 hover:text-cyan-400 text-sm flex items-center gap-1 mb-6">
	← Wróć
</a>

<div class="space-y-6">
	<!-- Product header -->
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-slate-100">{product.name}</h1>
			{#if data.activeDrop}
				<ScarcityBadge remainingMinutes={remaining} class="mt-2" />
			{/if}
		</div>
		<div class="text-right flex-shrink-0">
			<p class="text-3xl font-bold text-cyan-400">{formatPln(product.price_pln)}</p>
		</div>
	</div>

	<!-- Description -->
	{#if product.description}
		<p class="text-slate-300 text-sm leading-relaxed">{product.description}</p>
	{/if}

	<!-- Print time widget -->
	<div class="bg-slate-900 border border-slate-700 rounded-lg p-4 flex items-center gap-3">
		<div class="text-2xl">🖨️</div>
		<div>
			<p class="text-xs text-slate-500 uppercase tracking-wide">Czas druku</p>
			<p class="text-slate-200 font-semibold">{formatMinutes(product.print_duration_minutes)}</p>
			<p class="text-slate-500 text-xs mt-0.5">na jeden egzemplarz</p>
		</div>
	</div>

	<!-- Colour picker -->
	{#if regularVariants.length > 0}
		<div>
			<p class="text-sm text-slate-400 mb-3">
				Kolor filamentu:
				{#if selectedVariant}
					<span class="text-slate-200 font-medium">{selectedVariant.filament_color}</span>
				{/if}
			</p>
			<div class="flex flex-wrap gap-2">
				{#each regularVariants as variant}
					<ColorSwatch
						{variant}
						selected={selectedVariant?.id === variant.id}
						onSelect={() => (selectedVariant = variant)}
					/>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Add to cart -->
	{#if !data.settings.printer_is_on}
		<div class="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
			<p class="text-amber-300 text-sm">Drukarnia jest teraz offline.</p>
			{#if data.settings.status_message}
				<p class="text-slate-500 text-xs mt-1">{data.settings.status_message}</p>
			{/if}
		</div>
	{:else if !data.activeDrop}
		<div class="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
			<p class="text-slate-400 text-sm">Brak aktywnego dropu.</p>
		</div>
	{:else}
		<button
			onclick={handleAddToCart}
			disabled={!canAdd}
			class="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold py-4 rounded-xl text-base transition-colors"
		>
			Dodaj do koszyka
		</button>

		{#if mysteryVariant}
			<button
				onclick={handleMysteryBox}
				class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm transition-colors border border-indigo-400/30"
			>
				🎲 Surprise Me! — Mystery Box
			</button>
		{/if}
	{/if}
</div>
