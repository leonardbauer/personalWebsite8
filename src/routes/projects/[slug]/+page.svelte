<script lang="ts">
	import type { EnhancedSrc, GalleryImage } from "$lib/data/projects";
	let { data } = $props();
	const project = $derived(data.project);
	const galleryItems = $derived<(GalleryImage | null)[]>(
		project.gallery && project.gallery.length > 0
			? project.gallery
			: [null, null],
	);
	const aboutSegments = $derived(parseAbout(project.about ?? ""));
	let lightboxSrc = $state<EnhancedSrc | null>(null);

	function parseAbout(text: string): Array<string | { tag: string }> {
		const result: Array<string | { tag: string }> = [];
		const regex = /\[\[([^\]]+)\]\]/g;
		let lastIdx = 0;
		let match: RegExpExecArray | null;
		while ((match = regex.exec(text)) !== null) {
			if (match.index > lastIdx)
				result.push(text.slice(lastIdx, match.index));
			result.push({ tag: match[1] });
			lastIdx = regex.lastIndex;
		}
		if (lastIdx < text.length) result.push(text.slice(lastIdx));
		return result;
	}

	function findByTag(tag: string): GalleryImage | undefined {
		return project.gallery?.find((g) => g.tag === tag);
	}

	function openLightbox(src: EnhancedSrc) {
		lightboxSrc = src;
	}
	function closeLightbox() {
		lightboxSrc = null;
	}
	function onLightboxKey(e: KeyboardEvent) {
		if (e.key === "Escape") closeLightbox();
	}
	function onOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) closeLightbox();
	}
	function onTagRefClick(tag: string) {
		const img = findByTag(tag);
		if (img) openLightbox(img.src);
	}

	$effect(() => {
		const bg = project.bg;
		const fg = project.fg;
		const accent = project.accent ?? fg;
		const prevBody = document.body.style.backgroundColor;
		const prevHtml = document.documentElement.style.backgroundColor;
		document.body.style.backgroundColor = bg;
		document.documentElement.style.backgroundColor = bg;
		document.body.style.setProperty("--projects-fg", fg);
		document.body.style.setProperty("--projects-accent", accent);
		document.body.style.setProperty("--projects-bg", bg);
		return () => {
			document.body.style.backgroundColor = prevBody;
			document.documentElement.style.backgroundColor = prevHtml;
			document.body.style.removeProperty("--projects-fg");
			document.body.style.removeProperty("--projects-accent");
			document.body.style.removeProperty("--projects-bg");
		};
	});
</script>

<svelte:head>
	<title>{project.title}</title>
	<meta name="theme-color" content={project.bg} />
	<style>html { background-color: {project.bg}; }</style>
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

<div class="page" style="background:{project.bg}; color:{project.fg};">
	<a class="back" href="/projects">← back to projects</a>

	<div class="layout">
		<header class="hdr">
			{#if project.logo}
				<enhanced:img
					class="logo-img {project.logoStyle === 'circle' ? 'logo' : 'logo-natural'}"
					src={project.logo}
					alt="{project.title} logo"
					sizes="220px"
					fetchpriority="high"
				/>
			{:else}
				<div class="logo" aria-hidden="true"></div>
			{/if}
			<h1
				style="color: {project.accent ??
					project.fg}; font-family: {project.titleFont ?? 'inherit'};"
			>
				{project.title}
			</h1>
			<p class="tagline">{project.tagline}</p>
		</header>

		<section class="about-section">
			<div class="tag about-tag">about</div>
			<div class="about-content">
				<p>
					{#each aboutSegments as seg, i (i)}
						{#if typeof seg === "string"}{seg}{:else}<button
								type="button"
								class="tag-ref"
								onclick={() => onTagRefClick(seg.tag)}
								>{findByTag(seg.tag)?.title ?? seg.tag}</button
							>{/if}
					{/each}
				</p>
				{#if project.links && project.links.length > 0}
					<ul class="links">
						{#each project.links as link (link.url)}
							<li>
								<a
									class="project-link"
									href={link.url}
									target={link.external ? "_blank" : undefined}
									rel={link.external
										? "noopener noreferrer"
										: undefined}
									style="color: {project.accent ?? project.fg};"
								>
									{link.label} →
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>

		<aside class="gallery-col">
			<div class="tag gallery-tag">gallery</div>
			<div class="gallery-list">
				{#each galleryItems as item, i (i)}
					{#if item}
						<figure class="gallery-figure">
							<button
								class="gallery-button"
								type="button"
								onclick={() => openLightbox(item.src)}
								aria-label="View {item.title ?? `image ${i + 1}`}"
							>
								<enhanced:img
									class="gallery-item gallery-img"
									src={item.src}
									alt={item.title ?? ""}
									sizes="(max-width: 800px) 100vw, 32vw"
									loading={i === 0 ? "eager" : "lazy"}
								/>
							</button>
							{#if item.title}
								<figcaption class="gallery-caption">{item.title}</figcaption>
							{/if}
						</figure>
					{:else}
						<div class="gallery-item gallery-placeholder">image {i + 1}</div>
					{/if}
				{/each}
			</div>
		</aside>
	</div>
</div>

<svelte:window onkeydown={onLightboxKey} />

{#if lightboxSrc}
	<div
		class="lightbox"
		role="dialog"
		aria-modal="true"
		aria-label="Image viewer"
		tabindex="-1"
		onclick={onOverlayClick}
		onkeydown={onLightboxKey}
	>
		<button
			class="lightbox-close"
			type="button"
			onclick={closeLightbox}
			aria-label="Close"
		>
			×
		</button>
		<enhanced:img class="lightbox-img" src={lightboxSrc} alt="" sizes="95vw" />
	</div>
{/if}

<style>
	.page {
		min-height: 100vh;
		padding: 7rem 4rem 4rem;
		box-sizing: border-box;
	}
	.back {
		display: inline-block;
		font-size: 0.95rem;
		text-decoration: underline;
		margin-bottom: 3rem;
		opacity: 0.8;
	}
	.back:hover {
		opacity: 1;
	}
	.layout {
		display: grid;
		grid-template-columns: 1fr 32%;
		grid-template-rows: auto auto;
		column-gap: 3rem;
		row-gap: 3rem;
		align-items: start;
	}
	.hdr {
		grid-column: 1;
		grid-row: 1;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 50rem;
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
		font-size: clamp(3rem, 8vw, 7rem);
		font-weight: 800;
		line-height: 0.95;
		letter-spacing: -0.02em;
		margin: 0;
	}
	.tagline {
		font-size: clamp(1.1rem, 1.6vw, 1.5rem);
		line-height: 1.4;
		font-weight: 500;
		margin: 0;
	}
	.tag {
		background: var(--projects-accent, rgba(255, 255, 255, 0.85));
		color: var(--projects-bg, #1a1a1a);
		padding: 0.4rem 0.9rem;
		font-size: 1.4rem;
		font-weight: 600;
		text-transform: lowercase;
		letter-spacing: 0.02em;
		width: 100%;
		box-sizing: border-box;
	}
	.about-section {
		grid-column: 1;
		grid-row: 2;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.about-content p {
		font-size: 1.1rem;
		line-height: 1.7;
		max-width: 48rem;
		margin: 0;
	}
	.tag-ref {
		display: inline;
		padding: 0.05em 0.4em;
		margin: 0 0.05em;
		border: 0;
		background: var(--projects-accent, rgba(255, 255, 255, 0.85));
		color: var(--projects-bg, #1a1a1a);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		border-radius: 0.15em;
	}
	.tag-ref:hover {
		filter: brightness(0.92);
	}
	.links {
		list-style: none;
		padding: 0;
		margin: 1.5rem 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.project-link {
		font-size: 1.05rem;
		font-weight: 600;
		text-decoration: underline;
		width: max-content;
	}
	.gallery-col {
		grid-column: 2;
		grid-row: 2;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.gallery-list {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.gallery-item {
		display: block;
		width: 100%;
	}
	.gallery-placeholder {
		aspect-ratio: 1 / 1;
		background: var(--projects-accent, rgba(255, 255, 255, 0.85));
		color: var(--projects-bg, #1a1a1a);
		display: grid;
		place-items: center;
		font-weight: 700;
		font-size: 0.9rem;
		text-transform: lowercase;
	}
	.gallery-figure {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.gallery-caption {
		font-size: 0.9rem;
		opacity: 0.75;
		text-transform: lowercase;
	}
	.gallery-button {
		display: block;
		width: 100%;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		cursor: zoom-in;
	}
	.gallery-img {
		width: auto;
		height: auto;
		max-width: 100%;
		max-height: 60vh;
		filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.45));
	}
	.lightbox {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.92);
		display: grid;
		place-items: center;
		z-index: 100;
		cursor: zoom-out;
		overflow: auto;
	}
	.lightbox-img {
		max-width: 95vw;
		max-height: 95vh;
		display: block;
		cursor: default;
	}
	.lightbox-close {
		position: fixed;
		top: 1.5rem;
		right: 1.5rem;
		width: 40px;
		height: 40px;
		border: 0;
		background: rgba(255, 255, 255, 0.1);
		color: #ffffff;
		font-size: 1.6rem;
		line-height: 1;
		border-radius: 50%;
		cursor: pointer;
		z-index: 101;
	}
	.lightbox-close:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	@media (max-width: 800px) {
		.page {
			padding: 6rem 1.25rem 2rem;
		}
		.layout {
			grid-template-columns: 1fr;
			gap: 2rem;
		}
		.hdr,
		.about-section,
		.gallery-col {
			grid-column: 1;
			grid-row: auto;
		}
	}
</style>
