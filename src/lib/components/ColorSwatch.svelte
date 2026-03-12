<script lang="ts">
	import type { ProductVariant } from '$lib/server/db/schema';

	let {
		variant,
		selected,
		onSelect
	}: {
		variant: ProductVariant;
		selected: boolean;
		onSelect: () => void;
	} = $props();
</script>

<button
	type="button"
	onclick={onSelect}
	title={variant.filament_color}
	class={`relative w-9 h-9 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
		selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-110' : 'hover:scale-105'
	}`}
	style="background-color: {variant.hex_code}"
>
	{#if selected}
		<span
			class="absolute inset-0 flex items-center justify-center"
		>
			<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
				<path
					fill-rule="evenodd"
					d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
					clip-rule="evenodd"
					style="filter: drop-shadow(0 0 1px rgba(0,0,0,0.8))"
					fill="white"
				/>
			</svg>
		</span>
	{/if}
</button>
