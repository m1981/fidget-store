<script lang="ts">
	import { scarcityLabel } from '$lib/formatting';

	let {
		remainingMinutes,
		class: className = ''
	}: {
		remainingMinutes: number;
		class?: string;
	} = $props();

	const urgent = $derived(remainingMinutes < 120);
</script>

<span
	class={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
		urgent
			? 'bg-red-900/50 text-red-300 border border-red-700/50'
			: 'bg-slate-800 text-slate-400 border border-slate-700'
	} ${className}`}
>
	{#if urgent}🔥{/if}
	{scarcityLabel(remainingMinutes)}
</span>
