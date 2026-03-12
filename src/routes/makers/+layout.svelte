<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<nav class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
		<span class="font-bold text-gray-900">Fidget Fun! — Produkcja</span>
		<form method="POST" action="/makers/logout">
			<button type="submit" class="text-sm text-gray-500 hover:text-gray-700">Wyloguj</button>
		</form>
	</nav>
	<main class="max-w-2xl mx-auto px-4 py-6">
		{@render children()}
	</main>
</div>
