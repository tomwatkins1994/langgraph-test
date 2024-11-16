<script lang="ts">
import "../app.css";
const { children } = $props();
</script>

<svelte:head>
	<title>LangGraph Test</title>
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
</svelte:head>

{@render children()}
