<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<meta property="og:title" content="Projects — Leonard Bauer" />
	<meta
		property="og:description"
		content="A showcase of things Leonard Bauer has built — software, electronics, music tools."
	/>
</svelte:head>

{#if data.projects.length === 0}
	<div class="min-h-[60vh] flex items-center justify-center">
		<p class="text-xl">
			Right now I am preparing all my projects so they can be displayed here ;)
		</p>
	</div>
{:else}
	<div class="snap-container">
		{#each data.projects as project (project.id)}
			<section
				class="snap-section"
				style="background-color: {project.colorPrimary}; color: {project.colorSecondary};"
			>
				<div class="snap-inner">
					<div class="snap-text">
						{#if project.tagline}
							<span
								class="text-xs uppercase tracking-widest"
								style="color: {project.colorAccent};"
							>
								{project.tagline}
							</span>
						{/if}
						<h1
							class="text-5xl md:text-7xl font-black mt-2 mb-6 leading-none lowercase"
						>
							{project.title}
						</h1>
						<p class="text-base md:text-lg max-w-prose leading-relaxed">
							{project.content}
						</p>
						<div class="mt-8 flex gap-4 items-center flex-wrap">
							<a
								href="/projects/{project.slug}"
								class="px-5 py-2 rounded-full font-medium transition-opacity hover:opacity-80"
								style="background-color: {project.colorAccent}; color: {project.colorPrimary};"
							>
								read more
							</a>
							{#if project.link}
								<a
									href={project.link}
									target="_blank"
									rel="noopener noreferrer"
									class="px-5 py-2 rounded-full font-medium border-2 transition-opacity hover:opacity-80"
									style="border-color: {project.colorSecondary};"
								>
									visit ↗
								</a>
							{/if}
						</div>
					</div>
					{#if project.image}
						<div class="snap-image">
							<img
								src={project.image}
								alt={project.title}
								loading="lazy"
							/>
						</div>
					{/if}
				</div>
			</section>
		{/each}
	</div>
{/if}

<style>
	.snap-container {
		position: fixed;
		inset: 0;
		overflow-y: auto;
		scroll-snap-type: y mandatory;
		scroll-padding-top: 50px;
		z-index: 1;
	}
	.snap-section {
		scroll-snap-align: start;
		scroll-snap-stop: always;
		min-height: 100vh;
		padding-top: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background-color 0.4s ease;
	}
	.snap-inner {
		width: 100%;
		max-width: 1400px;
		padding: 2rem 1.5rem;
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
		align-items: center;
	}
	@media (min-width: 768px) {
		.snap-inner {
			grid-template-columns: 1fr 1fr;
			padding: 3rem 4rem;
			gap: 4rem;
		}
	}
	.snap-text {
		min-width: 0;
	}
	.snap-image {
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.snap-image img {
		max-width: 100%;
		max-height: 70vh;
		border-radius: 1rem;
		box-shadow: 0 30px 60px rgba(0, 0, 0, 0.35);
		object-fit: cover;
	}
</style>
