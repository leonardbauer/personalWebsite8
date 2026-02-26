<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.png";
	import { page } from "$app/stores";
	import { pageStyle } from "$lib/stores/pageStyle";

	let { data, children } = $props();
	const siteName = "Leonard Bauer";
</script>

<svelte:head>
	<title>{$page.data.title ? `${$page.data.title} | ${siteName}` : siteName}</title>
	<link rel="icon" href={favicon} />
	<link rel="alternate" type="application/atom+xml" title={siteName} href="/posts.atom" />
</svelte:head>
<div
	class="lg:px-30 sm:px-10 px-5 items-center pt-20 overflow-clip"
	style="background-color: {$pageStyle.backgroundColor}; color: {$pageStyle.textColor}; min-height: 100vh;"
>
	<div class="flex items-center w-full">
		<nav class="flex justify-evenly w-full md:mx-30 mb-5 sm:mb-15">
			<a href="/" class:active={$page.url.pathname == "/"}
				>blog</a
			>
			<a
				href="/projects"
				class:active={$page.url.pathname == "/projects"}
				>projects</a
			>
			<a
				href="/music"
				class:active={$page.url.pathname == "/music"}
				>music</a
			>
		</nav>
	</div>
	<div>
		{@render children()}
	</div>
	<div class="mt-10 border-t-2 p-5">
		<div class="text-2xl/7 line">leonard<br />bauer</div>
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
