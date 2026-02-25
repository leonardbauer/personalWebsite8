<script>
	import textClip from "$lib/assets/textclip.png";
	import { pageStyle } from "$lib/stores/pageStyle";
	import { onMount, onDestroy } from "svelte";

	let bgX = $state(50);
	let bgY = $state(50);

	function handleMouseMove(event) {
		const x = (event.clientX / window.innerWidth) * 100;
		const y = (event.clientY / window.innerHeight) * 100;
		bgX = 25 + x * 0.5;
		bgY = 25 + y * 0.5;
	}

	onMount(() => {
		pageStyle.set({
			backgroundColor: "#1a1a2e",
			textColor: "#ffffff",
		});
	});

	onDestroy(() => {
		pageStyle.set({
			backgroundColor: "#ffffff",
			textColor: "#000000",
		});
	});
</script>

<svelte:window onmousemove={handleMouseMove} />

<h1
	class="title"
	style="background-image: url({textClip}); background-position: {bgX}% {bgY}%;"
>
	pfharmer
</h1>

<style>
	.title {
		font-family: "eight", sans-serif;
		font-weight: 400;
		font-size: 10rem;
		font-style: normal;
		background-size: 150%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;

		transition: transform 400ms cubic-bezier(1,0,0,1.65), background 300ms cubic-bezier(.32,0,.53,1.48);
	}
	.title:hover {
		transform: scale(1.2);
	}
</style>
