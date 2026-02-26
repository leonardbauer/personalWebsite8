<script lang="ts">
	let { data } = $props();
	import Icon from "@iconify/svelte";

	function preview(content: string, maxWords = 400) {
		const words = content.split(/\s+/);
		if (words.length <= maxWords) return content;
		return words.slice(0, maxWords).join(' ') + '...';
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
			><Icon width="32" icon="simple-icons:linkedin" class="" /></a
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
wide, but my main focus is on software engineering. <span class="underline font-bold">Feel free to reach out</span>. [this text is written by a real human aka. myself]

<div class="lg:pr-60 xl:pr-96 my-4 thermal">
	<h3 class="text-4xl font-black italic">blog:</h3>
</div>

<div class="w-full flex flex-col gap-4">
	{#each data.posts as post}
		{@const hasMore = post.content.split(/\s+/).length > 400}
		<article class="bg-[#eee] p-5 drop-shadow-sm rounded-sm lg:w-[60%] w-full">
			<a href="/blog/{post.slug}">
				<h4 class="mb-2 lowercase">{post.title}</h4>
			</a>
			<time class="text-xs opacity-70">
				{new Date(post.createdAt).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})}
			</time>
			<div class="relative mt-2">
				<p>{preview(post.content)}</p>
				{#if hasMore}
					<a href="/blog/{post.slug}" class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#eee] to-transparent flex items-end justify-center pb-2">
						<span class="text-sm underline">Read more</span>
					</a>
				{/if}
			</div>
		</article>
	{/each}
</div>
