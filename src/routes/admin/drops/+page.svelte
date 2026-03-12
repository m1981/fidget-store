<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const drops = $derived(data.drops);

	const statusColors: Record<string, string> = {
		DRAFT: 'bg-gray-100 text-gray-700',
		ACTIVE: 'bg-green-100 text-green-800',
		CLOSED: 'bg-blue-100 text-blue-800'
	};

	const statusLabels: Record<string, string> = {
		DRAFT: 'Szkic',
		ACTIVE: 'Aktywny',
		CLOSED: 'Zamknięty'
	};
</script>

<svelte:head>
	<title>Admin — Dropy</title>
</svelte:head>

<div class="flex items-center justify-between mb-6">
	<h1 class="text-2xl font-bold text-gray-900">Dropy</h1>
	<a
		href="/admin/drops/new"
		class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
	>
		+ Nowy drop
	</a>
</div>

{#if drops.length === 0}
	<p class="text-gray-500 text-sm">Brak dropów. Utwórz pierwszy drop, aby zacząć sprzedawać.</p>
{:else}
	<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
		<table class="w-full text-sm">
			<thead class="bg-gray-50 border-b border-gray-200">
				<tr>
					<th class="text-left px-4 py-3 font-medium text-gray-600">ID</th>
					<th class="text-left px-4 py-3 font-medium text-gray-600">Status</th>
					<th class="text-left px-4 py-3 font-medium text-gray-600">Otwiera</th>
					<th class="text-left px-4 py-3 font-medium text-gray-600">Zamyka</th>
					<th class="text-right px-4 py-3 font-medium text-gray-600">Pojemność</th>
					<th class="text-right px-4 py-3 font-medium text-gray-600">Użyte</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100">
				{#each drops as d}
					<tr
						class="hover:bg-gray-50 cursor-pointer"
						onclick={() => (window.location.href = `/admin/drops/${d.id}`)}
					>
						<td class="px-4 py-3 text-gray-500">#{d.id}</td>
						<td class="px-4 py-3">
							<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {statusColors[d.status] ?? ''}">
								{statusLabels[d.status] ?? d.status}
							</span>
						</td>
						<td class="px-4 py-3 text-gray-700">{new Date(d.opens_at).toLocaleDateString('pl-PL')}</td>
						<td class="px-4 py-3 text-gray-700">{new Date(d.closes_at).toLocaleDateString('pl-PL')}</td>
						<td class="px-4 py-3 text-right text-gray-700">{d.total_capacity_minutes} min</td>
						<td class="px-4 py-3 text-right text-gray-700">{d.allocated_minutes} min</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
