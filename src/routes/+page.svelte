<script lang="ts">
	let { data } = $props();
	import Icon from "@iconify/svelte";
	import { marked } from "marked";
	import { currentTheme } from "$lib/stores/theme";

	function preview(content: string, maxWords = 100) {
		const words = content.split(/\s+/);
		if (words.length <= maxWords) return content;
		return words.slice(0, maxWords).join(" ") + "...";
	}
</script>

<h1 class="mb-3 dropshadow">leonard bauer</h1>
<h2 class="md:pl-10 pl-5 dropshadow">
	<a href="mailto:leonard@lnrdbr.com">leonard[at]lnrdbr(dot)com</a>
</h2>
<div class="p-2 pt-1">
	<span class="text-xs italic highwidth">socials</span>
	<div class="flex gap-4 mt-1">
		<a
			target="_blank"
			href="https://www.linkedin.com/in/leonardbauer/"
			class="hover:text-[#0077B5]"
			><Icon
				width="32"
				icon="simple-icons:linkedin"
				class=""
			/></a
		>
		<a
			target="_blank"
			href="https://github.com/leonardbauer"
			class="hover:text-[#0FBF3E]"
			><Icon width="32" icon="simple-icons:github" />
		</a>
		<a
			target="_blank"
			href="https://pfharmer.bandcamp.com/"
			class="hover:text-[#1DA0C3]"
			><Icon width="32" icon="simple-icons:bandcamp" /></a
		>
		<a
			target="_blank"
			href="https://soundcloud.com/pfharmer"
			class="hover:text-[#FF5500]"
			><Icon width="32" icon="simple-icons:soundcloud" />
		</a>
	</div>
</div>
<h3 class="text-4xl font-black italic">about me:</h3>
I am a curious student. From a very young age, I loved to explore and tinker with
computers, electronics, synthesizers, and other complex systems. These days, I am
passionate about writing and learning about many fields. My interests are spread
wide, but my main focus is on software engineering.<span
	class="underline font-bold">Feel free to reach out</span
>. [this text is written by a real human aka. myself]

<div class="lg:pr-60 xl:pr-96 my-4 thermal">
	<h3 class="text-4xl font-black italic">blog:</h3>
</div>
<div class="mb-4">
	i try to figure out certain solutions instead of ranting about problems
	in this. i hope this inspires you :)
</div>
<div class="w-full flex flex-col gap-4">
	{#each data.posts as post}
		{@const hasMore = post.content.split(/\s+/).length > 100}
		<article
			class="p-5 drop-shadow-sm rounded-sm overflow-clip lg:w-[60%] w-full transition-colors duration-300"
			style="background-color: {$currentTheme.backgroundSecondary}; color: {$currentTheme.text};"
		>
			<a href="/blog/{post.slug}">
				<h4 class="mb-2 lowercase mb-4">
					{post.title}
				</h4>
			</a>
			<time
				class="text-xs"
				style="color: {$currentTheme.textMuted};"
			>
				{new Date(post.createdAt).toLocaleDateString(
					"en-US",
					{
						year: "numeric",
						month: "long",
						day: "numeric",
					},
				)}
			</time>
			<div class=" w-full mt-2 mb-4">
				<div class="prose max-w-none">
					{@html marked(preview(post.content))}
				</div>
				{#if hasMore}
					<a
						href="/blog/{post.slug}"
						class="absolute inset-x-0 bottom-0 h-36 flex items-end justify-center "
						style="background: linear-gradient(to top, {$currentTheme.textMuted}, transparent);"
					>
						<span class="text-sm underline pb-3" style="color: {$currentTheme.text}"
							>Read more</span
						>
					</a>
				{/if}
			</div>
		</article>
	{/each}
</div>

<style>
	.prose {
		color: inherit;
		width: 100%;
	}
	.prose :global(h1) {
		font-size: 1.5rem !important;
		font-weight: 700;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
		line-height: 1.2;
		color: inherit !important;
		background: none !important;
	}
	.prose :global(h2) {
		font-size: 1.25rem !important;
		font-weight: 300;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
		background: none !important;
		color: inherit !important;
	}
	.prose :global(h3) {
		font-size: 1.1rem !important;
		font-weight: 600;
		margin-top: 0.75rem;
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
		margin-bottom: 0.75rem;
		line-height: 1.6;
		color: inherit;
	}
	.prose :global(a) {
		text-decoration: underline;
		color: inherit;
	}
	.prose :global(ul),
	.prose :global(ol) {
		margin-left: 1.5rem;
		margin-bottom: 0.75rem;
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
		border-left: 3px solid currentColor;
		padding-left: 1rem;
		font-style: italic;
		opacity: 0.85;
		color: inherit;
	}
	.prose :global(code) {
		background: var(--color-code-background);
		padding: 0.15rem 0.3rem;
		border-radius: 0.25rem;
		font-size: 0.9em;
		color: inherit;
	}
	.prose :global(pre) {
		background: var(--color-code-background);
		padding: 0.75rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		color: inherit;
	}
	.prose :global(pre code) {
		background: none;
		padding: 0;
	}
</style>
