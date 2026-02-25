<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.svg";
	import { page } from "$app/stores";
	import { pageStyle } from "$lib/stores/pageStyle";

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="lg:px-30 sm:px-10 px-5 flex flex-col items-center pt-20" style="background-color: {$pageStyle.backgroundColor}; color: {$pageStyle.textColor}; min-height: 100vh;">
	<nav class="flex justify-evenly mx-30 w-full mb-15">
		<a href="/" class:active={$page.url.pathname == "/"}>blog</a>
		<a href="/music" class:active={$page.url.pathname == "/music"}
			>music</a
		>
		<a
			href="/projects"
			class:active={$page.url.pathname == "/projects"}
			>projects</a
		>
	</nav>
	<div>
		{@render children()}
	</div>
</div>

<style>
a{
		transition: 0.2s cubic-bezier(.32,0,.53,1.48);
		color: inherit;
}
	a:hover {
		transform: scale(2,6);
	}
	a.active {
		text-decoration: underline;
	}
</style>
