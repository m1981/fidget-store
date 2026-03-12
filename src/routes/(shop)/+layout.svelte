<script lang="ts">
	import { cartCount } from '$lib/cart.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<div class="min-h-screen bg-slate-950 text-slate-100 font-mono">
	<!-- Header -->
	<header class="border-b border-slate-800 bg-slate-950/90 sticky top-0 z-50 backdrop-blur">
		<div class="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
			<a href="/" class="flex items-center gap-2">
				<span class="text-cyan-400 font-bold text-lg tracking-tight">FIDGET FUN!</span>
				<span class="text-slate-500 text-xs">by Leo & Sam</span>
			</a>

			<a
				href="/checkout"
				class="flex items-center gap-1.5 text-sm text-slate-300 hover:text-cyan-400 transition-colors"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-5 h-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.35 6h11.7M7 13L5.4 5M17 21a1 1 0 100-2 1 1 0 000 2zM9 21a1 1 0 100-2 1 1 0 000 2z"
					/>
				</svg>
				{#if cartCount() > 0}
					<span
						class="bg-cyan-500 text-slate-950 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
					>
						{cartCount()}
					</span>
				{/if}
			</a>
		</div>
	</header>

	<!-- Factory status banner -->
	{#if !data.settings.printer_is_on}
		<div class="bg-amber-900/40 border-b border-amber-700/50 px-4 py-2 text-center">
			<p class="text-amber-300 text-sm">
				🔧 <span class="font-semibold">Drukarnia offline</span>
				{#if data.settings.status_message}
					— {data.settings.status_message}
				{/if}
			</p>
		</div>
	{/if}

	<main class="max-w-lg mx-auto px-4 py-6">
		{@render children()}
	</main>

	<footer class="border-t border-slate-800 mt-12 px-4 py-6 text-center text-slate-600 text-xs">
		<p>Fidget Fun! · Ręcznie drukowane w Polsce 🇵🇱</p>
		<p class="mt-1">Prowadzone przez Leo (12l.) & Sam (10l.) z pomocą Wujka Mike'a</p>
	</footer>
</div>
