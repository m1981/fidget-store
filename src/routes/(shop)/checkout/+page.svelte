<script lang="ts">
	import { enhance } from '$app/forms';
	import BlikTimer from '$lib/components/BlikTimer.svelte';
	import { cartItems, cartTotal, cartToCheckoutPayload, clearCart } from '$lib/cart.svelte';
	import { formatPln } from '$lib/formatting';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const items = $derived(cartItems());
	const total = $derived(cartTotal());

	let submitting = $state(false);
	let inpostPointId = $state('');

	// After successful order creation, show BLIK timer
	const orderId = $derived((form as { orderId?: string } | null)?.orderId ?? null);

	function handleBlikExpire() {
		// Redirect back to shop — order will be cancelled by cron
		window.location.href = '/?blik_expired=1';
	}

	function handleBlikSuccess() {
		clearCart();
		if (orderId) window.location.href = `/orders/${orderId}`;
	}

	// Simulated InPost picker (Phase 4: replace with real Geowidget)
	function pickInpostPoint() {
		inpostPointId = 'WAW01A'; // stub
		alert('W Phase 4 pojawi się tu mapa InPost Geowidget.');
	}
</script>

<svelte:head>
	<title>Koszyk — Fidget Fun!</title>
</svelte:head>

{#if orderId}
	<!-- BLIK payment step -->
	<div class="space-y-6">
		<div>
			<h1 class="text-xl font-bold text-slate-100">Płatność BLIK</h1>
			<p class="text-slate-400 text-sm mt-1">
				Zamówienie #{orderId.slice(0, 8)} — {formatPln((form as { totalPln?: number } | null)?.totalPln ?? 0)}
			</p>
		</div>

		<BlikTimer onExpire={handleBlikExpire} onSuccess={handleBlikSuccess} />

		<p class="text-slate-500 text-xs text-center">
			Kod BLIK ważny 2 minuty. Rezerwacja zostanie anulowana po upływie czasu.
		</p>
	</div>
{:else}
	<!-- Checkout form -->
	<div class="space-y-6">
		<h1 class="text-xl font-bold text-slate-100">Koszyk</h1>

		{#if items.length === 0}
			<div class="text-center py-12 border border-dashed border-slate-700 rounded-xl">
				<p class="text-slate-400">Koszyk jest pusty.</p>
				<a href="/" class="text-cyan-400 text-sm mt-2 inline-block hover:underline">
					← Wróć do sklepu
				</a>
			</div>
		{:else}
			<!-- Cart summary -->
			<div class="bg-slate-900 border border-slate-700 rounded-xl divide-y divide-slate-800">
				{#each items as item}
					<div class="p-4 flex items-center gap-3">
						<span
							class="w-6 h-6 rounded-full flex-shrink-0 border border-slate-600"
							style="background-color: {item.hexCode}"
						></span>
						<div class="flex-1 min-w-0">
							<p class="text-slate-200 text-sm font-medium">{item.productName}</p>
							<p class="text-slate-500 text-xs">{item.filamentColor} × {item.quantity}</p>
						</div>
						<p class="text-cyan-400 font-bold text-sm flex-shrink-0">
							{formatPln(item.pricePln * item.quantity)}
						</p>
					</div>
				{/each}
				<div class="p-4 flex justify-between items-center">
					<span class="text-slate-400 text-sm">Razem</span>
					<span class="text-cyan-400 font-bold text-xl">{formatPln(total)}</span>
				</div>
			</div>

			{#if !data.settings.printer_is_on}
				<div class="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 text-center">
					<p class="text-amber-300 text-sm">Drukarnia offline — zamówienia są zablokowane.</p>
				</div>
			{:else}
				<!-- Checkout form -->
				<form
					method="POST"
					action="?/checkout"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							submitting = false;
							await update();
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="cart" value={JSON.stringify(cartToCheckoutPayload())} />
					<input type="hidden" name="inpost_point_id" value={inpostPointId} />

					<div>
						<label for="email" class="block text-xs text-slate-400 mb-1">E-mail</label>
						<input
							id="email"
							name="email"
							type="email"
							required
							autocomplete="email"
							class="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
							placeholder="twój@email.com"
						/>
					</div>

					<div>
						<label for="phone" class="block text-xs text-slate-400 mb-1">Telefon</label>
						<input
							id="phone"
							name="phone"
							type="tel"
							required
							autocomplete="tel"
							class="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
							placeholder="+48 600 000 000"
						/>
					</div>

					<!-- InPost picker -->
					<div>
						<p class="text-xs text-slate-400 mb-1">Paczkomat InPost</p>
						{#if inpostPointId}
							<div class="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 flex justify-between items-center">
								<span class="text-slate-200 text-sm font-medium">{inpostPointId}</span>
								<button
									type="button"
									onclick={pickInpostPoint}
									class="text-cyan-400 text-xs hover:underline"
								>
									Zmień
								</button>
							</div>
						{:else}
							<button
								type="button"
								onclick={pickInpostPoint}
								class="w-full bg-slate-800 border border-dashed border-slate-600 hover:border-cyan-600 rounded-lg px-3 py-3 text-slate-400 hover:text-cyan-400 text-sm transition-colors"
							>
								📍 Wybierz paczkomat na mapie
							</button>
						{/if}
					</div>

					{#if form?.error}
						<div class="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
							<p class="text-red-300 text-sm">{form.error}</p>
						</div>
					{/if}

					<button
						type="submit"
						disabled={submitting || !inpostPointId}
						class="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold py-4 rounded-xl text-base transition-colors"
					>
						{submitting ? 'Przetwarzam…' : `Zamawiam i płacę BLIK — ${formatPln(total)}`}
					</button>
				</form>
			{/if}
		{/if}
	</div>
{/if}
