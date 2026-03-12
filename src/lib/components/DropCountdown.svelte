<script lang="ts">
	import { onMount } from 'svelte';

	let { closesAt }: { closesAt: Date } = $props();

	let remaining = $state(0);
	let interval: ReturnType<typeof setInterval> | undefined;

	function tick() {
		remaining = Math.max(0, Math.floor((closesAt.getTime() - Date.now()) / 1000));
	}

	onMount(() => {
		tick();
		interval = setInterval(tick, 1000);
		return () => clearInterval(interval);
	});

	const days = $derived(Math.floor(remaining / 86400));
	const hours = $derived(Math.floor((remaining % 86400) / 3600));
	const minutes = $derived(Math.floor((remaining % 3600) / 60));
	const seconds = $derived(remaining % 60);

	const isClosed = $derived(remaining === 0);
</script>

{#if isClosed}
	<p class="text-red-400 text-sm font-medium">Drop zakończony.</p>
{:else}
	<div class="flex items-center gap-1 text-sm text-slate-400">
		<span class="text-slate-500 text-xs">Drop zamyka się za:</span>
		<span class="font-mono text-slate-200 ml-1">
			{#if days > 0}{days}d {/if}{hours.toString().padStart(2, '0')}:{minutes
				.toString()
				.padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
		</span>
	</div>
{/if}
