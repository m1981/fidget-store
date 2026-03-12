<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<h1>Database Connection Test</h1>

<h2>✅ Database Connected!</h2>

<h3>Global Settings:</h3>
<pre>{JSON.stringify(data.settings, null, 2)}</pre>

<h3>Active Drop:</h3>
<pre>{JSON.stringify(data.activeDrop, null, 2)}</pre>

