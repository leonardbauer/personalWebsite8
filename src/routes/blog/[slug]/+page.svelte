<script lang="ts">
	import { marked } from 'marked';
	import { currentTheme } from '$lib/stores/theme';
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';

	let { data } = $props();

	const html = $derived(marked(data.post.content));
	const shareUrl = $derived(`https://lnrdbr.com${$page.url.pathname}`);
	const shareText = $derived(data.post.title);

	// Strip markdown formatting for description
	function stripMarkdown(text: string): string {
		return text
			.replace(/!\[.*?\]\(.*?\)/g, '') // images
			.replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // links
			.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1') // bold/italic
			.replace(/`{1,3}[^`]*`{1,3}/g, '') // code
			.replace(/^#{1,6}\s+/gm, '') // headings
			.replace(/^[-*+]\s+/gm, '') // list items
			.replace(/^>\s+/gm, '') // blockquotes
			.replace(/\n+/g, ' ') // newlines
			.trim();
	}

	// Extract first image from markdown, fallback to favicon
	function extractImage(content: string): string {
		const match = content.match(/!\[.*?\]\((.*?)\)/);
		return match ? match[1] : 'https://lnrdbr.com/favicon.png';
	}

	const description = $derived(stripMarkdown(data.post.content).split(/\s+/).slice(0, 30).join(' ') + '...');
	const ogImage = $derived(extractImage(data.post.content));
</script>

<svelte:head>
	<meta property="og:title" content={data.post.title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={shareUrl} />
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="Leonard Bauer" />
	<meta property="og:image" content={ogImage} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.post.title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>

<article class="max-w-3xl">
	<h1 class="text-4xl font-black mb-4 md:mb-2 z-0 relative">{data.post.title}</h1>
	<div class="flex items-center gap-4 flex-wrap p-1 z-10 relative" style="background-color: {$currentTheme.background}; ">
		<time class="text-sm  " style="color: {$currentTheme.textMuted};">
			{new Date(data.post.createdAt).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})}
		</time>
		<span class="text-sm" style="color: {$currentTheme.textMuted};">
			{data.post.viewCount} views
		</span>
		<div class="lg:hidden flex items-center gap-3 ml-auto">
			<a
				href="https://twitter.com/intent/tweet?url={encodeURIComponent(shareUrl)}&text={encodeURIComponent(shareText)}"
				target="_blank"
				rel="noopener noreferrer"
				class="hover:opacity-70 transition-opacity"
				aria-label="Share on Twitter"
			>
				<Icon icon="simple-icons:x" width={20} />
			</a>
			<a
				href="https://www.linkedin.com/sharing/share-offsite/?url={encodeURIComponent(shareUrl)}"
				target="_blank"
				rel="noopener noreferrer"
				class="hover:opacity-70 transition-opacity"
				aria-label="Share on LinkedIn"
			>
				<Icon icon="simple-icons:linkedin" width={20} />
			</a>
			<button
				onclick={() => navigator.clipboard.writeText(shareUrl)}
				class="hover:opacity-70 transition-opacity"
				aria-label="Copy link"
			>
				<Icon icon="lucide:link" width={20} />
			</button>
		</div>
	</div>
	<div class="flex gap-8 mt-6">
		<div class="prose flex-1">
			{@html html}
		</div>
		<aside class="hidden lg:flex flex-col gap-3 sticky top-20 h-fit">
			<span class="text-xs" style="color: {$currentTheme.textMuted};">share</span>
			<a
				href="https://twitter.com/intent/tweet?url={encodeURIComponent(shareUrl)}&text={encodeURIComponent(shareText)}"
				target="_blank"
				rel="noopener noreferrer"
				class="hover:opacity-70 transition-opacity"
				aria-label="Share on Twitter"
			>
				<Icon icon="simple-icons:x" width={24} />
			</a>
			<a
				href="https://www.linkedin.com/sharing/share-offsite/?url={encodeURIComponent(shareUrl)}"
				target="_blank"
				rel="noopener noreferrer"
				class="hover:opacity-70 transition-opacity"
				aria-label="Share on LinkedIn"
			>
				<Icon icon="simple-icons:linkedin" width={24} />
			</a>
			<button
				onclick={() => navigator.clipboard.writeText(shareUrl)}
				class="hover:opacity-70 transition-opacity text-left"
				aria-label="Copy link"
			>
				<Icon icon="lucide:link" width={24} />
			</button>
		</aside>
	</div>
</article>

<div class="lg:hidden mt-8 flex items-center gap-4">
	<span class="text-xs" style="color: {$currentTheme.textMuted};">share</span>
	<a
		href="https://twitter.com/intent/tweet?url={encodeURIComponent(shareUrl)}&text={encodeURIComponent(shareText)}"
		target="_blank"
		rel="noopener noreferrer"
		class="hover:opacity-70 transition-opacity"
		aria-label="Share on Twitter"
	>
		<Icon icon="simple-icons:x" width={24} />
	</a>
	<a
		href="https://www.linkedin.com/sharing/share-offsite/?url={encodeURIComponent(shareUrl)}"
		target="_blank"
		rel="noopener noreferrer"
		class="hover:opacity-70 transition-opacity"
		aria-label="Share on LinkedIn"
	>
		<Icon icon="simple-icons:linkedin" width={24} />
	</a>
	<button
		onclick={() => navigator.clipboard.writeText(shareUrl)}
		class="hover:opacity-70 transition-opacity"
		aria-label="Copy link"
	>
		<Icon icon="lucide:link" width={24} />
	</button>
</div>

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
	.prose :global(strong) {
		color: inherit;
		font-weight: 700;
	}
	.prose :global(em) {
		color: inherit;
		font-style: italic;
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
