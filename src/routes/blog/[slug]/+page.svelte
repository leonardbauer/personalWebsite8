<script lang="ts">
	import { marked } from 'marked';

	let { data } = $props();

	const html = $derived(marked(data.post.content));
</script>

<article class="max-w-3xl">
	<h1 class="text-4xl font-black mb-2">{data.post.title}</h1>
	<time class="text-sm opacity-70 bg-white z-10">
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
	.prose :global(h1) {
		font-size: 2rem;
		font-weight: 700;
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
	}
	.prose :global(h2) {
		font-size: 1.5rem;
		font-weight: 600;
		margin-top: 1.25rem;
		margin-bottom: 0.5rem;
	}
	.prose :global(h3) {
		font-size: 1.25rem;
		font-weight: 600;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}
	.prose :global(p) {
		margin-bottom: 1rem;
		line-height: 1.7;
	}
	.prose :global(a) {
		text-decoration: underline;
	}
	.prose :global(ul), .prose :global(ol) {
		margin-left: 1.5rem;
		margin-bottom: 1rem;
	}
	.prose :global(ul) {
		list-style-type: disc;
	}
	.prose :global(ol) {
		list-style-type: decimal;
	}
	.prose :global(blockquote) {
		border-left: 4px solid currentColor;
		padding-left: 1rem;
		margin: 1rem 0;
		font-style: italic;
		opacity: 0.85;
	}
	.prose :global(code) {
		background: rgba(0,0,0,0.1);
		padding: 0.2rem 0.4rem;
		border-radius: 0.25rem;
		font-size: 0.9em;
	}
	.prose :global(pre) {
		background: rgba(0,0,0,0.05);
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin-bottom: 1rem;
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
