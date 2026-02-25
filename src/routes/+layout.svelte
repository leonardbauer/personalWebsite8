<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.svg";
	import { page } from "$app/stores";
	import { pageStyle } from "$lib/stores/pageStyle";

	let { data, children } = $props();
	const siteName = "Leonard Bauer";
</script>

<svelte:head>
	<title>{data.title ? `${data.title} | ${siteName}` : siteName}</title>
	<link rel="icon" href={favicon} /></svelte:head
>
<div
	class="lg:px-30 sm:px-10 px-5 items-center pt-20"
	style="background-color: {$pageStyle.backgroundColor}; color: {$pageStyle.textColor}; min-height: 100vh;"
>
	<div class="flex items-center w-full">
		<nav class="flex justify-evenly w-full md:mx-30 mb-5 sm:mb-15">
			<a href="/" class:active={$page.url.pathname == "/"}
				>blog</a
			>
			<a
				href="/music"
				class:active={$page.url.pathname == "/music"}
				>music</a
			>
			<a
				href="/projects"
				class:active={$page.url.pathname == "/projects"}
				>projects</a
			>
		</nav>
	</div>
	<div>
		{@render children()}
	</div>
</div>

<style>
	a {
	}
	@media (hover: hover) {
		a {
			transition: 0.2s cubic-bezier(0.32, 0, 0.53, 1.48);
		}

		a:hover {
			transform: scale(2, 6);
		}
	}
	a.active {
		text-decoration: underline;
	}

</style>
