<script lang="ts">
	import { marked } from 'marked';
	import { currentTheme } from '$lib/stores/theme';

	let { data } = $props();

	const html = $derived(marked(data.post.content));
</script>

<article class="max-w-3xl">
	<h1 class="text-4xl font-black mb-4 md:mb-2 z-0 relative">{data.post.title}</h1>
	<time class="text-sm z-10 relative p-1" style="background-color: {$currentTheme.background}; color: {$currentTheme.textMuted};">
		{new Date(data.post.createdAt).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})}
	</time>
	<div class="mt-6 prose">
		{@html html}
	</div>
</article>

<style>
	/* Customize markdown styles here */
	.prose {
		color: inherit;
	}
	.prose :global(h1) {
		font-size: 2rem !important;
		font-weight: 700;
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
		line-height: 1.2;
		color: inherit !important;
		background: none !important;
	}
	.prose :global(h2) {
		font-size: 1.5rem !important;
		font-weight: 600;
		margin-top: 1.25rem;
		margin-bottom: 0.5rem;
		background: none !important;
		color: inherit !important;
	}
	.prose :global(h3) {
		font-size: 1.25rem !important;
		font-weight: 600;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
		color: inherit !important;
	}
	.prose :global(h4) {
		font-size: 1.1rem !important;
		font-weight: 600;
		margin-top: 0.75rem;
		margin-bottom: 0.5rem;
		color: inherit !important;
	}
	.prose :global(p) {
		margin-bottom: 1rem;
		line-height: 1.7;
		color: inherit;
	}
	.prose :global(a) {
		text-decoration: underline;
		color: inherit;
	}
	.prose :global(ul), .prose :global(ol) {
		margin-left: 1.5rem;
		margin-bottom: 1rem;
		color: inherit;
	}
	.prose :global(ul) {
		list-style-type: disc;
	}
	.prose :global(ol) {
		list-style-type: decimal;
	}
	.prose :global(li) {
		color: inherit;
	}
	.prose :global(blockquote) {
		border-left: 4px solid currentColor;
		padding-left: 1rem;
		margin: 1rem 0;
		font-style: italic;
		opacity: 0.85;
		color: inherit;
	}
	.prose :global(code) {
		background: var(--color-code-background);
		padding: 0.2rem 0.4rem;
		border-radius: 0.25rem;
		font-size: 0.9em;
		color: inherit;
	}
	.prose :global(pre) {
		background: var(--color-code-background);
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin-bottom: 1rem;
		color: inherit;
	}
	.prose :global(pre code) {
		background: none;
		padding: 0;
	}
	.prose :global(img) {
		max-width: 100%;
		border-radius: 0.5rem;
		margin: 1rem 0;
	}
</style>
