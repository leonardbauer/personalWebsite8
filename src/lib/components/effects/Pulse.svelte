<script lang="ts">
	import { lightshow } from "$lib/lightshow/store.svelte";

	let {
		channel,
		color = "#ffffff",
		scale = 1.4,
		decay = 350,
		children
	}: {
		channel: string;
		color?: string;
		scale?: number;
		decay?: number;
		children?: import("svelte").Snippet;
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

	let style = $derived(
		`--pulse-color: ${color}; --pulse-intensity: ${intensity}; --pulse-scale: ${1 + (scale - 1) * intensity}; --pulse-decay: ${decay}ms;`
	);
</script>

<div class="pulse" {style}>
	{#if children}{@render children()}{/if}
</div>

<style>
	.pulse {
		display: inline-block;
		transform: scale(var(--pulse-scale));
		filter: drop-shadow(0 0 calc(20px * var(--pulse-intensity)) var(--pulse-color));
		transition:
			transform var(--pulse-decay) cubic-bezier(0.16, 1, 0.3, 1),
			filter var(--pulse-decay) ease-out;
	}
</style>
