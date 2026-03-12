<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Admin — Zaloguj się</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
	<div class="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
		<h1 class="text-2xl font-bold text-gray-900 mb-6 text-center">Panel administracyjny</h1>

		{#if form?.error}
			<p class="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
				{form.error}
			</p>
		{/if}

		<form method="POST" class="space-y-4">
			<div>
				<label for="password" class="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
					class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			<button
				type="submit"
				class="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors"
			>
				Zaloguj się
			</button>
		</form>
	</div>
</div>
