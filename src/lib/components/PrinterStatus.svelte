<script lang="ts">
	let {
		isOn,
		message = '',
		estimatedDays = 3
	}: {
		isOn: boolean;
		message?: string;
		estimatedDays?: number;
	} = $props();
</script>

<div
	class={`rounded-xl border p-4 flex items-start gap-4 ${
		isOn ? 'bg-emerald-950/40 border-emerald-700/50' : 'bg-slate-900 border-slate-700'
	}`}
>
	<!-- Status indicator -->
	<div class="relative flex-shrink-0 mt-0.5">
		<div
			class={`w-3 h-3 rounded-full ${isOn ? 'bg-emerald-400' : 'bg-red-500'}`}
		></div>
		{#if isOn}
			<div
				class="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-75"
			></div>
		{/if}
	</div>

	<div class="flex-1 min-w-0">
		{#if isOn}
			<p class="font-bold text-emerald-400 text-sm">DRUKARNIA AKTYWNA</p>
			<p class="text-slate-400 text-xs mt-0.5">
				Dysza gorąca i gotowa. Wysyłka za ok. {estimatedDays} dni robocze.
			</p>
		{:else}
			<p class="font-bold text-red-400 text-sm">DRUKARNIA OFFLINE</p>
			{#if message}
				<p class="text-slate-400 text-xs mt-0.5">{message}</p>
			{:else}
				<p class="text-slate-500 text-xs mt-0.5">Zamówienia tymczasowo wstrzymane.</p>
			{/if}
		{/if}
	</div>
</div>
