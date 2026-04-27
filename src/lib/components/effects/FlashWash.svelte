<script lang="ts">
	import { onMount } from "svelte";
	import { lightshow } from "$lib/lightshow/store.svelte";

	let {
		channel,
		note,
		colors = {},
		defaultColor = "#ffffff",
		maxOpacity = 0.6,
		decay = 400
	}: {
		channel: string;
		note?: string | string[];
		colors?: Record<string, string>;
		defaultColor?: string;
		maxOpacity?: number;
		decay?: number;
	} = $props();

	let el: HTMLDivElement;

	onMount(() => {
		const allowed = note ? (Array.isArray(note) ? note : [note]) : null;

		return lightshow.subscribe((trigger) => {
			if (trigger.channel !== channel) return;
			if (allowed && !allowed.includes(trigger.event.noteName)) return;
			if (!el) return;

			const peak = trigger.event.velocity * maxOpacity;
			const color = colors[trigger.event.noteName] ?? defaultColor;

			el.style.transition = "none";
			el.style.backgroundColor = color;
			el.style.opacity = String(peak);
			void el.offsetHeight;
			el.style.transition = `opacity ${decay}ms ease-out`;
			el.style.opacity = "0";
		});
	});
</script>

<div bind:this={el} class="flash-wash"></div>

<style>
	.flash-wash {
		position: fixed;
		inset: 0;
		opacity: 0;
		pointer-events: none;
		z-index: 5;
		mix-blend-mode: screen;
	}
</style>
