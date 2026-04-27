<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.png";
	import { page } from "$app/stores";
	import { currentTheme, themeName, toggleTheme } from "$lib/stores/theme";
	import Icon from "@iconify/svelte/dist/OfflineIcon.svelte";
	import { sunIcon, moonIcon } from "$lib/icons";
	import background from "$lib/assets/background.jpg";
	import { onMount } from "svelte";

	let { data, children } = $props();
	const siteName = "Leonard Bauer";

	let bgX = $state(50);
	let bgY = $state(50);

	function handleMouseMove(event: MouseEvent) {
		if ($page.url.pathname !== '/music') return;
		const x = (event.clientX / window.innerWidth) * 100;
		const y = (event.clientY / window.innerHeight) * 100;
		bgX = 25 + x * 0.5;
		bgY = 25 + y * 0.5;
	}

	const CELL = 50;
	let cols = $state(0);
	let cells = $state<Array<{ delay: number; duration: number }>>([]);

	function rebuildGrid() {
		cols = Math.ceil(window.innerWidth / CELL);
		const rows = Math.ceil(window.innerHeight / CELL);
		cells = Array.from({ length: cols * rows }, () => ({
			delay: -Math.random() * 8,
			duration: 4 + Math.random() * 6
		}));
	}

	onMount(() => {
		rebuildGrid();
		window.addEventListener("resize", rebuildGrid);
		return () => window.removeEventListener("resize", rebuildGrid);
	});
</script>

<svelte:head>
	<title>{$page.data.title ? `${$page.data.title} | ${siteName}` : siteName}</title>
	<link rel="icon" href={favicon} />
	<link rel="alternate" type="application/atom+xml" title={siteName} href="/posts.atom" />
	{@html '<script type="application/ld+json">' + JSON.stringify({
		"@context": "https://schema.org",
		"@type": "Person",
		"name": "Leonard Bauer",
		"url": "https://lnrdbr.com",
		"email": "leonard@lnrdbr.com",
		"jobTitle": "Software Engineer",
		"description": "Curious student passionate about software engineering, electronics, synthesizers, and complex systems.",
		"sameAs": [
			"https://www.linkedin.com/in/leonardbauer/",
			"https://github.com/leonardbauer",
			"https://pfharmer.bandcamp.com/",
			"https://soundcloud.com/pfharmer"
		]
	}) + '<\/script>'}
</svelte:head>
<svelte:window onmousemove={handleMouseMove} />
{#if $page.url.pathname === '/music'}
	<div
		class="page-bg"
		style="background-image: url({background}); background-position: {bgX}% {bgY}%;"
	></div>
	<div class="pixel-grid" style="grid-template-columns: repeat({cols}, 50px);">
		{#each cells as cell, i (i)}
			<div
				class="pixel"
				style="animation-delay: {cell.delay}s; animation-duration: {cell.duration}s;"
			></div>
		{/each}
	</div>
{/if}
<div
	class="lg:px-30 sm:px-10 px-5 items-center pt-[50px] overflow-clip transition-colors duration-300"
	style="color: {$currentTheme.text}; min-height: 100vh;"
>
	{#if !$page.url.pathname.startsWith('/music/studio')}
		<div class="flex items-center justify-center w-full h-[50px] mb-[50px]">
			<nav class="flex justify-evenly w-full">
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
	{/if}
	<div>
		{@render children()}
	</div>
	{#if !$page.url.pathname.startsWith('/music/studio')}
	<div class="mt-10 border-t-2 p-5 flex justify-between items-end" style="border-color: {$currentTheme.border};">
		<div class="text-2xl/7 line">leonard<br />bauer</div>
		<button
			onclick={toggleTheme}
			class="p-2 rounded-full hover:opacity-70 transition-opacity"
			style="background-color: {$currentTheme.backgroundSecondary};"
			aria-label="Toggle theme"
		>
			{#if $themeName === 'dark' || ($themeName === 'system' && $currentTheme.name === 'Dark')}
				<Icon icon={sunIcon} width={20} />
			{:else}
				<Icon icon={moonIcon} width={20} />
			{/if}
		</button>
	</div>
	{/if}
</div>

<style>
	.page-bg {
		position: fixed;
		inset: 0;
		background-size: cover;
		background-repeat: no-repeat;
		pointer-events: none;
		z-index: -2;
	}
	.pixel-grid {
		position: fixed;
		inset: 0;
		display: grid;
		grid-auto-rows: 50px;
		pointer-events: none;
		z-index: -1;
		overflow: hidden;
	}
	.pixel {
		background-color: black;
		opacity: 0.7;
		animation: flicker infinite ease-in-out;
	}
	@keyframes flicker {
		0%, 75%, 100% { opacity: 0.7; }
		85% { opacity: 0.05; }
	}
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
