<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { projects } from "$lib/data/projects";

	const WHEEL_BEZIER = "cubic-bezier(0.99, 0, 0.13, 0.98)";
	const CLICK_BEZIER = "cubic-bezier(0.43, -0.34, 0.13, 0.98)";
	const WHEEL_MS = 500;
	const CLICK_MS = 950;
	const RETRIGGER_MS = 380;
	const MIN_DELTA = 12;
	const TOUCH_THRESHOLD = 50;

	const STORAGE_KEY = "projects-active-idx";
	const CAROUSEL_INTERVAL_MS = 3000;

	let activeIdx = $state(0);
	let carouselIdx = $state(0);
	let viewMode = $state<"carousel" | "grid">("carousel");
	let scroller: HTMLElement | undefined = $state();
	let trackEl: HTMLElement | undefined = $state();
	let curEasing = $state(WHEEL_BEZIER);
	let curMs = $state(WHEEL_MS);
	let lastTrigger = -Infinity;

	if (typeof window !== "undefined") {
		const stored = sessionStorage.getItem(STORAGE_KEY);
		if (stored !== null) {
			const idx = parseInt(stored, 10);
			if (!Number.isNaN(idx) && idx >= 0 && idx < projects.length) {
				activeIdx = idx;
			}
		}
	}

	function go(direction: number) {
		const next = activeIdx + direction;
		if (next < 0 || next >= projects.length) return;
		curEasing = WHEEL_BEZIER;
		curMs = WHEEL_MS;
		activeIdx = next;
		lastTrigger = performance.now();
	}

	function scrollTo(i: number) {
		if (i !== activeIdx) {
			curEasing = CLICK_BEZIER;
			curMs = CLICK_MS;
			activeIdx = i;
			lastTrigger = performance.now();
		}
		viewMode = "carousel";
	}

	function toggleOverview() {
		viewMode = viewMode === "grid" ? "carousel" : "grid";
	}

	function onWheel(e: WheelEvent) {
		if (e.ctrlKey) return;
		if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
		e.preventDefault();
		if (performance.now() - lastTrigger < RETRIGGER_MS) return;
		if (Math.abs(e.deltaY) < MIN_DELTA) return;
		go(e.deltaY > 0 ? 1 : -1);
	}

	let touchY = 0;
	function onTouchStart(e: TouchEvent) {
		touchY = e.touches[0]?.clientY ?? 0;
	}
	function onTouchEnd(e: TouchEvent) {
		const endY = e.changedTouches[0]?.clientY ?? touchY;
		const delta = touchY - endY;
		if (delta > TOUCH_THRESHOLD) go(1);
		else if (delta < -TOUCH_THRESHOLD) go(-1);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === "ArrowDown" || e.key === "PageDown") {
			e.preventDefault();
			go(1);
		} else if (e.key === "ArrowUp" || e.key === "PageUp") {
			e.preventDefault();
			go(-1);
		}
	}

	onMount(() => {
		const el = scroller;
		if (!el) return;
		el.addEventListener("wheel", onWheel, { passive: false });
		el.addEventListener("touchstart", onTouchStart, { passive: true });
		el.addEventListener("touchend", onTouchEnd, { passive: true });
		window.addEventListener("keydown", onKey);
		return () => {
			el.removeEventListener("wheel", onWheel);
			el.removeEventListener("touchstart", onTouchStart);
			el.removeEventListener("touchend", onTouchEnd);
			window.removeEventListener("keydown", onKey);
		};
	});

	let bgTimer: ReturnType<typeof setTimeout> | null = null;
	let prevBodyBg = "";
	let prevHtmlBg = "";
	let firstBgUpdate = true;
	const chromeBg = $derived(projects[activeIdx]?.bg ?? "#1a1a1a");

	onMount(() => {
		prevBodyBg = document.body.style.backgroundColor;
		prevHtmlBg = document.documentElement.style.backgroundColor;
	});

	onDestroy(() => {
		if (bgTimer) clearTimeout(bgTimer);
		if (typeof document === "undefined") return;
		document.body.style.backgroundColor = prevBodyBg;
		document.documentElement.style.backgroundColor = prevHtmlBg;
		document.body.style.removeProperty("--projects-fg");
		document.body.style.removeProperty("--projects-accent");
	});

	$effect(() => {
		const cur = projects[activeIdx];
		const bg = cur?.bg ?? "";
		const fg = cur?.fg ?? "#ffffff";
		const accent = cur?.accent ?? fg;
		const delay = firstBgUpdate ? 0 : curMs * 0.5;
		firstBgUpdate = false;
		if (bgTimer) clearTimeout(bgTimer);
		bgTimer = setTimeout(() => {
			document.body.style.backgroundColor = bg;
			document.documentElement.style.backgroundColor = bg;
			document.body.style.setProperty("--projects-fg", fg);
			document.body.style.setProperty("--projects-accent", accent);
		}, delay);
	});

	$effect(() => {
		if (typeof window === "undefined") return;
		sessionStorage.setItem(STORAGE_KEY, String(activeIdx));
	});

	$effect(() => {
		carouselIdx = 0;
		const cur = projects[activeIdx];
		if (!cur?.gallery || cur.gallery.length <= 1) return;
		const len = cur.gallery.length;
		const interval = setInterval(() => {
			carouselIdx = (carouselIdx + 1) % len;
		}, CAROUSEL_INTERVAL_MS);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<meta name="theme-color" content={chromeBg} />
	<style>html { background-color: {chromeBg}; }</style>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		rel="preconnect"
		href="https://fonts.gstatic.com"
		crossorigin="anonymous"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Caveat+Brush&family=Gurajada&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="scroller" bind:this={scroller}>
	<div
		class="track"
		bind:this={trackEl}
		style="transform: translateY(-{activeIdx * 100}vh); --anim-ms: {curMs}ms; --anim-easing: {curEasing};"
	>
		{#each projects as p, panelIdx (p.slug)}
			{@const carIdx = panelIdx === activeIdx ? carouselIdx : 0}
			{@const eager = panelIdx === 0}
			{@const carItem = p.gallery && p.gallery.length > 0 ? (p.gallery[carIdx] ?? p.gallery[0]) : null}
			<section class="panel" style="background:{p.bg}; color:{p.fg};">
				<div class="content">
					<div class="left">
						{#if p.logo}
							<enhanced:img
								class="logo-img {p.logoStyle === 'circle' ? 'logo' : 'logo-natural'}"
								src={p.logo}
								alt="{p.title} logo"
								sizes="220px"
								loading={eager ? "eager" : "lazy"}
								fetchpriority={eager ? "high" : "auto"}
							/>
						{:else}
							<div class="logo" aria-hidden="true"></div>
						{/if}
						<h1
							style="color: {p.accent ??
								p.fg}; font-family: {p.titleFont ?? 'inherit'};"
						>
							{p.title}
						</h1>
						<p class="tagline">{p.tagline}</p>
						<a
							class="more"
							href="/projects/{p.slug}"
							style="color: {p.accent ?? p.fg};"
							>Find out more →</a
						>
					</div>
					<div class="right">
						{#if p.gallery && p.gallery.length > 0 && carItem}
							<enhanced:img
								class="carousel carousel-img"
								src={carItem.src}
								alt={carItem.title ?? `${p.title} preview`}
								sizes="min(38vw, 560px)"
								loading={eager ? "eager" : "lazy"}
								fetchpriority={eager ? "high" : "auto"}
							/>
							<div class="dots" style="color: {p.accent ?? p.fg};">
								{#each p.gallery as _, di (di)}
									<span class="dot" class:active={di === carIdx}></span>
								{/each}
							</div>
						{:else}
							<div class="carousel">Caroussel</div>
							<div class="dots" style="color: {p.accent ?? p.fg};">
								<span class="dot active"></span>
								<span class="dot"></span>
							</div>
						{/if}
					</div>
				</div>
			</section>
		{/each}
	</div>
</div>

<aside class="rail">
	<button
		class="rail-label"
		type="button"
		onclick={toggleOverview}
		aria-pressed={viewMode === "grid"}
	>
		{viewMode === "grid" ? "back to carousel" : "gallery overview"}
	</button>
	<ol class="thumbs">
		{#each projects as q, j (q.slug)}
			<li>
				<button
					class="thumb"
					class:active={j === activeIdx}
					aria-label={q.title}
					aria-current={j === activeIdx ? "true" : undefined}
					onclick={() => scrollTo(j)}
				></button>
			</li>
		{/each}
	</ol>
</aside>

{#if viewMode === "grid"}
	<div class="grid-overview">
		{#each projects as p, i (p.slug)}
			<button
				class="grid-tile"
				type="button"
				style="background:{p.bg}; color:{p.fg};"
				onclick={() => scrollTo(i)}
			>
				<div class="grid-tile-inner">
					{#if p.logo}
						<enhanced:img
							class="grid-tile-logo logo-img {p.logoStyle === 'circle' ? 'logo' : 'logo-natural'}"
							src={p.logo}
							alt=""
							sizes="128px"
							loading="lazy"
						/>
					{/if}
					<h3
						class="grid-tile-title"
						style="color: {p.accent ??
							p.fg}; font-family: {p.titleFont ?? 'inherit'};"
					>
						{p.title}
					</h3>
					<p class="grid-tile-tagline">{p.tagline}</p>
				</div>
			</button>
		{/each}
	</div>
{/if}

<style>
	.scroller {
		position: fixed;
		inset: 0;
		overflow: hidden;
		overscroll-behavior-y: none;
	}
	.track {
		will-change: transform;
		transition-property: transform;
		transition-duration: var(--anim-ms, 700ms);
		transition-timing-function: var(
			--anim-easing,
			cubic-bezier(0.99, 0, 0.13, 0.98)
		);
	}
	.panel {
		height: 100vh;
		width: 100vw;
		padding: 7rem 4rem 4rem 9rem;
		box-sizing: border-box;
		display: flex;
		align-items: center;
	}
	.rail {
		position: fixed;
		top: 7rem;
		left: 4rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		z-index: 40;
		color: var(--projects-accent, var(--projects-fg, #ffffff));
		transition: color 0.5s ease;
	}
	.rail-label {
		writing-mode: vertical-rl;
		transform: rotate(180deg);
		text-decoration: underline;
		font-size: 0.95rem;
		letter-spacing: 0.02em;
		background: transparent;
		border: 0;
		padding: 0;
		color: inherit;
		font-family: inherit;
		cursor: pointer;
		text-transform: lowercase;
	}
	.rail-label:hover {
		opacity: 0.75;
	}
	.thumbs {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.thumb {
		display: block;
		width: 14px;
		height: 10px;
		border: 0;
		padding: 0;
		background: currentColor;
		opacity: 0.35;
		cursor: pointer;
		transition: opacity 0.2s, width 0.2s, height 0.2s;
	}
	.thumb:hover {
		opacity: 0.6;
	}
	.thumb.active {
		width: 22px;
		height: 16px;
		opacity: 0.85;
	}
	.content {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 3rem;
		align-items: center;
	}
	.left {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		max-width: 36rem;
	}
	.logo {
		width: 110px;
		height: 110px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.85);
		object-fit: cover;
	}
	.logo-img {
		background: transparent;
	}
	.logo-natural {
		display: block;
		height: 110px;
		width: auto;
		max-width: 100%;
		object-fit: contain;
		object-position: left center;
		align-self: flex-start;
		margin-right: auto;
	}
	h1 {
		font-size: clamp(3rem, 7vw, 6rem);
		font-weight: 800;
		line-height: 0.95;
		letter-spacing: -0.02em;
		margin: 0;
	}
	.tagline {
		font-size: clamp(1.1rem, 1.6vw, 1.5rem);
		line-height: 1.25;
		font-weight: 500;
		margin: 0;
	}
	.more {
		font-size: 1.1rem;
		font-weight: 600;
		text-decoration: underline;
		width: max-content;
	}
	.right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.75rem;
	}
	.carousel {
		aspect-ratio: 1 / 1;
		width: min(38vw, 560px);
		background: rgba(255, 255, 255, 0.85);
		color: #ff3a00;
		display: grid;
		place-items: center;
		font-weight: 700;
	}
	.carousel-img {
		display: block;
		background: transparent;
		object-fit: contain;
		filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.45));
	}
	.dots {
		display: flex;
		gap: 0.5rem;
	}
	.dot {
		width: 22px;
		height: 8px;
		background: currentColor;
		opacity: 0.35;
	}
	.dot.active {
		opacity: 0.85;
	}

	.grid-overview {
		position: fixed;
		inset: 0;
		padding: 7rem 4rem 4rem 9rem;
		box-sizing: border-box;
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-auto-rows: 50%;
		gap: 1rem;
		z-index: 30;
		overflow: auto;
		background: #000;
	}
	.grid-tile {
		border: 0;
		padding: 0;
		font: inherit;
		text-align: left;
		cursor: pointer;
		display: block;
		overflow: hidden;
		transition: transform 0.2s ease;
	}
	.grid-tile:hover {
		transform: scale(0.985);
	}
	.grid-tile-inner {
		height: 100%;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		gap: 0.75rem;
		box-sizing: border-box;
	}
	.grid-tile-logo {
		max-height: 64px;
		max-width: 50%;
		object-fit: contain;
		object-position: left center;
		margin-bottom: auto;
	}
	.grid-tile-logo.logo {
		width: 64px;
		height: 64px;
		border-radius: 50%;
	}
	.grid-tile-title {
		font-size: clamp(1.6rem, 3vw, 2.5rem);
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.02em;
		margin: 0;
	}
	.grid-tile-tagline {
		font-size: 0.95rem;
		line-height: 1.4;
		opacity: 0.85;
		margin: 0;
		max-width: 36rem;
	}

	@media (max-width: 900px) {
		.grid-overview {
			grid-template-columns: 1fr;
			grid-auto-rows: 50%;
			padding: 10rem 1rem 1.5rem;
			gap: 0.75rem;
		}
		.grid-tile-inner {
			padding: 1.25rem;
			gap: 0.5rem;
		}
		.grid-tile-logo {
			max-height: 40px;
			max-width: 40%;
		}
		.grid-tile-logo.logo {
			width: 40px;
			height: 40px;
		}
		.grid-tile-title {
			font-size: 1.6rem;
		}
		.grid-tile-tagline {
			font-size: 0.85rem;
			display: -webkit-box;
			-webkit-line-clamp: 3;
			line-clamp: 3;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}
		.panel {
			padding: 9rem 1.25rem 2rem;
			flex-direction: column;
		}
		.rail {
			top: 7.5rem;
			left: 1.25rem;
			flex-direction: row;
			align-items: center;
			gap: 0.75rem;
		}
		.rail-label {
			writing-mode: horizontal-tb;
			transform: none;
		}
		.thumbs {
			flex-direction: row;
		}
		.content {
			grid-template-columns: 1fr;
		}
		.right {
			display: none;
		}
	}
</style>
