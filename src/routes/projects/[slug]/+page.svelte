<script lang="ts">
	import { marked } from 'marked';

	let { data } = $props();
	const project = $derived(data.project);
	const reportHtml = $derived(project.report ? marked(project.report) : '');
</script>

<svelte:head>
	<meta property="og:title" content="{project.title} — Leonard Bauer" />
	<meta
		property="og:description"
		content={project.tagline ?? project.content.slice(0, 160)}
	/>
	{#if project.image}
		<meta property="og:image" content={project.image} />
	{/if}
</svelte:head>

<article
	class="project-detail"
	style="--color-primary: {project.colorPrimary}; --color-secondary: {project.colorSecondary}; --color-accent: {project.colorAccent};"
>
	<header
		class="hero"
		style="background-color: {project.colorPrimary}; color: {project.colorSecondary};"
	>
		<div class="hero-inner">
			{#if project.tagline}
				<span
					class="text-xs uppercase tracking-widest"
					style="color: {project.colorAccent};"
				>
					{project.tagline}
				</span>
			{/if}
			<h1 class="text-5xl md:text-7xl font-black mt-2 mb-4 lowercase leading-none">
				{project.title}
			</h1>
			<p class="text-base md:text-lg max-w-prose leading-relaxed">
				{project.content}
			</p>
			{#if project.link}
				<a
					href={project.link}
					target="_blank"
					rel="noopener noreferrer"
					class="mt-6 inline-block px-5 py-2 rounded-full font-medium transition-opacity hover:opacity-80"
					style="background-color: {project.colorAccent}; color: {project.colorPrimary};"
				>
					visit ↗
				</a>
			{/if}
		</div>
		{#if project.image}
			<img
				class="hero-image"
				src={project.image}
				alt={project.title}
			/>
		{/if}
	</header>

	{#if project.gallery.length > 0}
		<section class="gallery">
			<h2 class="text-2xl font-bold mb-4 lowercase">gallery</h2>
			<div class="gallery-grid">
				{#each project.gallery as src, i (i)}
					<a href={src} target="_blank" rel="noopener noreferrer">
						<img src={src} alt="{project.title} screenshot {i + 1}" loading="lazy" />
					</a>
				{/each}
			</div>
		</section>
	{/if}

	{#if reportHtml}
		<section class="report prose">
			{@html reportHtml}
		</section>
	{/if}

	<a
		href="/projects"
		class="back-link"
		style="color: {project.colorAccent};"
	>← all projects</a>
</article>

<style>
	.project-detail {
		max-width: 1100px;
		margin: 0 auto;
	}
	.hero {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
		padding: 3rem 1.5rem;
		border-radius: 1.5rem;
		margin-bottom: 3rem;
	}
	@media (min-width: 768px) {
		.hero {
			grid-template-columns: 1.1fr 0.9fr;
			padding: 4rem;
			align-items: center;
		}
	}
	.hero-inner {
		min-width: 0;
	}
	.hero-image {
		width: 100%;
		max-height: 60vh;
		border-radius: 1rem;
		object-fit: cover;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
	}
	.gallery {
		margin-bottom: 3rem;
	}
	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1rem;
	}
	.gallery-grid img {
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		border-radius: 0.75rem;
		transition: transform 0.2s ease;
	}
	.gallery-grid img:hover {
		transform: scale(1.02);
	}
	.report {
		margin-bottom: 3rem;
		max-width: 70ch;
	}
	.report :global(h1) {
		font-size: 2rem;
		font-weight: 700;
		margin: 1.5rem 0 0.75rem;
	}
	.report :global(h2) {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 1.25rem 0 0.5rem;
	}
	.report :global(h3) {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 1rem 0 0.5rem;
	}
	.report :global(p) {
		margin-bottom: 1rem;
		line-height: 1.7;
	}
	.report :global(a) {
		text-decoration: underline;
		color: var(--color-accent);
	}
	.report :global(ul),
	.report :global(ol) {
		margin: 0 0 1rem 1.5rem;
	}
	.report :global(ul) {
		list-style: disc;
	}
	.report :global(ol) {
		list-style: decimal;
	}
	.report :global(blockquote) {
		border-left: 3px solid var(--color-accent);
		padding-left: 1rem;
		font-style: italic;
		opacity: 0.85;
		margin: 1rem 0;
	}
	.report :global(code) {
		background: rgba(127, 127, 127, 0.15);
		padding: 0.15rem 0.35rem;
		border-radius: 0.25rem;
		font-size: 0.9em;
	}
	.report :global(pre) {
		background: rgba(127, 127, 127, 0.15);
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin-bottom: 1rem;
	}
	.report :global(pre code) {
		background: none;
		padding: 0;
	}
	.report :global(img) {
		max-width: 100%;
		border-radius: 0.5rem;
		margin: 1rem 0;
	}
	.back-link {
		display: inline-block;
		margin-top: 1rem;
		font-weight: 500;
		text-decoration: underline;
	}
</style>
