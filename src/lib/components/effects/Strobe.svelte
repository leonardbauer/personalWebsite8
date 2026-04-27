<script lang="ts">
	import { onMount } from "svelte";
	import { lightshow } from "$lib/lightshow/store.svelte";

	let {
		channel,
		color = "#ffffff",
		subdivisions = 4,
		bpm,
		duty = 0.5
	}: {
		channel: string;
		color?: string;
		subdivisions?: number;
		bpm?: number;
		duty?: number;
	} = $props();

	let el: HTMLDivElement;

	type Active = { startedAt: number; hold: number; velocity: number };
	let active: Active[] = [];

	onMount(() => {
		let rafId: number | null = null;

		function tick() {
			if (!el) {
				rafId = requestAnimationFrame(tick);
				return;
			}
			const now = performance.now() / 1000;
			const effectiveBpm = bpm ?? lightshow.bpm ?? 120;
			const period = 60 / effectiveBpm / Math.max(0.0625, subdivisions);

			let bestValue = 0;
			for (let i = active.length - 1; i >= 0; i--) {
				const a = active[i];
				const elapsed = now - a.startedAt;
				if (elapsed >= a.hold) {
					active.splice(i, 1);
					continue;
				}
				const phase = (elapsed / period) % 1;
				if (phase < duty) {
					const v = a.velocity;
					if (v > bestValue) bestValue = v;
				}
			}
			el.style.opacity = String(bestValue * 0.9);

			if (active.length === 0) {
				rafId = null;
				return;
			}
			rafId = requestAnimationFrame(tick);
		}

		function ensureRunning() {
			if (rafId === null) rafId = requestAnimationFrame(tick);
		}

		const off = lightshow.subscribe((trigger) => {
			if (trigger.channel !== channel) return;
			active.push({
				startedAt: performance.now() / 1000,
				hold: trigger.event.duration,
				velocity: trigger.event.velocity
			});
			if (active.length > 32) active.shift();
			ensureRunning();
		});

		return () => {
			off();
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	});
</script>

<div bind:this={el} class="strobe" style="background-color: {color};"></div>

<style>
	.strobe {
		position: fixed;
		inset: 0;
		opacity: 0;
		pointer-events: none;
		z-index: 10;
	}
</style>
