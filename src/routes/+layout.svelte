<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.png";
	import { page } from "$app/stores";
	import { currentTheme, themeName, toggleTheme } from "$lib/stores/theme";
	import Icon from "@iconify/svelte";

	let { data, children } = $props();
	const siteName = "Leonard Bauer";
</script>

<svelte:head>
	<title>{$page.data.title ? `${$page.data.title} | ${siteName}` : siteName}</title>
	<link rel="icon" href={favicon} />
	<link rel="alternate" type="application/atom+xml" title={siteName} href="/posts.atom" />
</svelte:head>
<div
	class="lg:px-30 sm:px-10 px-5 items-center pt-20 overflow-clip transition-colors duration-300"
	style="background-color: {$currentTheme.background}; color: {$currentTheme.text}; min-height: 100vh;"
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
	<div class="mt-10 border-t-2 p-5 flex justify-between items-end" style="border-color: {$currentTheme.border};">
		<div class="text-2xl/7 line">leonard<br />bauer</div>
		<button
			onclick={toggleTheme}
			class="p-2 rounded-full hover:opacity-70 transition-opacity"
			style="background-color: {$currentTheme.backgroundSecondary};"
			aria-label="Toggle theme"
		>
			{#if $themeName === 'dark' || ($themeName === 'system' && $currentTheme.name === 'Dark')}
				<Icon icon="lucide:sun" width={20} />
			{:else}
				<Icon icon="lucide:moon" width={20} />
			{/if}
		</button>
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
