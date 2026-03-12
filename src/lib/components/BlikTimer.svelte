<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { formatCountdown } from '$lib/formatting';

	let {
		onExpire,
		onSuccess = undefined,
		duration = 120
	}: {
		onExpire: () => void;
		onSuccess?: () => void;
		duration?: number;
	} = $props();

	// Capture initial duration — timer is one-shot and does not react to prop changes
	const totalSeconds = untrack(() => duration);
	let secondsLeft = $state(totalSeconds);
	let blikCode = $state('');
	let submitting = $state(false);
	let interval: ReturnType<typeof setInterval> | undefined;

	const progress = $derived(secondsLeft / totalSeconds);
	const isExpired = $derived(secondsLeft <= 0);
	const isUrgent = $derived(secondsLeft <= 30);
	const codeValid = $derived(/^\d{6}$/.test(blikCode));

	onMount(() => {
		interval = setInterval(() => {
			secondsLeft = Math.max(0, secondsLeft - 1);
			if (secondsLeft === 0) {
				clearInterval(interval);
				onExpire();
			}
		}, 1000);
		return () => clearInterval(interval);
	});

	function handleSubmit() {
		if (!codeValid || submitting || isExpired) return;
		submitting = true;
		// Phase 4: call payment gateway API here
		// For now: simulate success after 1 second
		setTimeout(() => {
			submitting = false;
			onSuccess?.();
		}, 1000);
	}

	function handleInput(e: Event) {
		const value = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6);
		blikCode = value;
	}
</script>

<div class="space-y-5">
	<!-- Countdown ring -->
	<div class="flex flex-col items-center gap-3">
		<div class="relative w-24 h-24">
			<svg class="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
				<!-- Background track -->
				<circle cx="48" cy="48" r="40" fill="none" stroke="#1e293b" stroke-width="8" />
				<!-- Progress arc -->
				<circle
					cx="48"
					cy="48"
					r="40"
					fill="none"
					stroke={isExpired ? '#ef4444' : isUrgent ? '#f59e0b' : '#22d3ee'}
					stroke-width="8"
					stroke-linecap="round"
					stroke-dasharray={2 * Math.PI * 40}
					stroke-dashoffset={2 * Math.PI * 40 * (1 - progress)}
					class="transition-all duration-1000"
				/>
			</svg>
			<div class="absolute inset-0 flex items-center justify-center">
				<span
					class={`font-mono font-bold text-2xl ${
						isExpired ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-cyan-400'
					}`}
				>
					{isExpired ? '0:00' : formatCountdown(secondsLeft)}
				</span>
			</div>
		</div>

		{#if isExpired}
			<p class="text-red-400 text-sm font-medium">Czas minął. Zamówienie zostanie anulowane.</p>
		{:else}
			<p class="text-slate-400 text-sm">Otwórz aplikację bankową i potwierdź BLIK</p>
		{/if}
	</div>

	<!-- BLIK code input -->
	<div class="space-y-3">
		<label for="blik-code" class="block text-xs text-slate-400 text-center">
			Wpisz 6-cyfrowy kod BLIK
		</label>
		<input
			id="blik-code"
			type="text"
			inputmode="numeric"
			autocomplete="one-time-code"
			value={blikCode}
			oninput={handleInput}
			disabled={isExpired || submitting}
			maxlength={6}
			placeholder="000000"
			class={`w-full text-center text-3xl font-mono tracking-widest bg-slate-800 border rounded-xl py-4 focus:outline-none transition-colors ${
				codeValid
					? 'border-cyan-500 text-cyan-400 focus:ring-1 focus:ring-cyan-500/30'
					: 'border-slate-600 text-slate-300 focus:border-cyan-600'
			} disabled:opacity-50`}
		/>

		<button
			type="button"
			onclick={handleSubmit}
			disabled={!codeValid || isExpired || submitting}
			class="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold py-4 rounded-xl text-base transition-colors"
		>
			{submitting ? 'Weryfikuję…' : 'Potwierdź płatność BLIK'}
		</button>
	</div>
</div>
