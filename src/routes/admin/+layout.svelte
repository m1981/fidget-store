<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const navItems = [
		{ href: '/admin', label: 'Dashboard' },
		{ href: '/admin/factory', label: 'Drukarka' },
		{ href: '/admin/drops', label: 'Dropy' },
		{ href: '/admin/orders', label: 'Zamówienia' }
	];
</script>

<div class="min-h-screen bg-gray-50">
	<nav class="bg-white border-b border-gray-200 px-4 py-3">
		<div class="max-w-4xl mx-auto flex items-center gap-6">
			<span class="font-bold text-gray-900">Fidget Fun! Admin</span>
			<div class="flex gap-4">
				{#each navItems as item}
					<a
						href={item.href}
						class="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
					>
						{item.label}
					</a>
				{/each}
			</div>
			<div class="ml-auto">
				<form method="POST" action="/admin/logout">
					<button type="submit" class="text-sm text-gray-500 hover:text-gray-700">Wyloguj</button>
				</form>
			</div>
		</div>
	</nav>

	<main class="max-w-4xl mx-auto px-4 py-8">
		{@render children()}
	</main>
</div>
