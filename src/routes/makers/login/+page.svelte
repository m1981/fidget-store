<script lang="ts">
	import type { ActionData } from './$types';
	let { form }: { form: ActionData } = $props();
</script>

<svelte:head><title>Makers — PIN</title></svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
	<div class="w-full max-w-xs bg-white rounded-2xl shadow-md p-8">
		<h1 class="text-xl font-bold text-gray-900 mb-6 text-center">Panel produkcji</h1>

		{#if form?.error}
			<p class="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{form.error}</p>
		{/if}

		<form method="POST" class="space-y-4">
			<div>
				<label for="pin" class="block text-sm font-medium text-gray-700 mb-1">PIN</label>
				<input
					id="pin"
					name="pin"
					type="password"
					inputmode="numeric"
					autocomplete="current-password"
					required
					class="w-full px-4 py-3 text-2xl text-center tracking-widest border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			<button type="submit" class="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors">
				Wejdź
			</button>
		</form>
	</div>
</div>
