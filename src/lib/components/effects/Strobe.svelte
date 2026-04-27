<script lang="ts">
	import { lightshow } from "$lib/lightshow/store.svelte";

	let {
		channel,
		color = "#ffffff",
		decay = 120
	}: {
		channel: string;
		color?: string;
		decay?: number;
	} = $props();

	let intensity = $state(0);

	$effect(() => {
		const trigger = lightshow.lastTrigger;
		if (!trigger || trigger.channel !== channel) return;
		intensity = trigger.event.velocity;
		const id = setTimeout(() => {
			intensity = 0;
		}, decay);
		return () => clearTimeout(id);
	});
</script>

<div
	class="strobe"
	style="background-color: {color}; opacity: {intensity * 0.8}; transition-duration: {decay}ms;"
></div>

<style>
	.strobe {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 10;
		transition: opacity ease-out;
	}
</style>
