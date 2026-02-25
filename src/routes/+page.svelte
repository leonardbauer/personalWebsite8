<script lang="ts">
	let { data } = $props();
	import Icon from "@iconify/svelte";
</script>

<h1 class="mb-3">leonard bauer</h1>
<h2 class="md:pl-10 pl-5">
	<a href="mailto:leonard@lnrdbr.com">leonard[at]lnrdbr(dot)com</a>
</h2>
<div class="p-2 pt-1">
<span class="text-xs italic highwidth">socials</span>
	<div class="flex gap-4 mt-1">
		<a
			target="_blank"
			href="https://www.linkedin.com/in/leonardbauer/"
			class="hover:text-[#0077B5]"
			><Icon width="32" icon="simple-icons:linkedin" /></a
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
<br />
<h3 class="text-4xl font-black italic">about me:</h3>
I am a curious student. From a very young age, I loved to explore and tinker with
computers, electronics, synthesizers, and other complex systems. These days, I am
passionate about writing and learning about many fields. My interests are spread
wide, but my main focus is on software engineering. Feel free to reach out.

<div class="lg:pr-60 xl:pr-96 my-4 thermal">
	<h3 class="text-4xl font-black italic">blog:</h3>
</div>

<div class="w-full">
	{#each data.posts as post}
		<article class="bg-[#eee] p-5 drop-shadow-md sm:w-[50%] w-full">
			<h4 class="mb-2">{post.title}</h4>
			<p>{post.content}</p>
		</article>
	{/each}
</div>
