<script lang="ts">
	import { onMount } from "svelte";
	import { lightshow } from "$lib/lightshow/store.svelte";
	import { envelope, envelopeDuration, type ADSR, DEFAULT_ADSR } from "$lib/lightshow/envelope";

	let {
		channel,
		note,
		colors = {},
		defaultColor = "#ffffff",
		maxOpacity = 0.6,
		adsr = DEFAULT_ADSR
	}: {
		channel: string;
		note?: string | string[];
		colors?: Record<string, string>;
		defaultColor?: string;
		maxOpacity?: number;
		adsr?: ADSR;
	} = $props();

	let el: HTMLDivElement;

	type Active = {
		startedAt: number;
		hold: number;
		velocity: number;
		color: string;
	};

	let active: Active[] = [];

	onMount(() => {
		const allowed = note ? (Array.isArray(note) ? note : [note]) : null;

		const off = lightshow.subscribe((trigger) => {
			if (trigger.channel !== channel) return;
			if (allowed && !allowed.includes(trigger.event.noteName)) return;
			active.push({
				startedAt: performance.now() / 1000,
				hold: trigger.event.duration,
				velocity: trigger.event.velocity,
				color: colors[trigger.event.noteName] ?? defaultColor
			});
			if (active.length > 32) active.shift();
		});

		let rafId: number | null = null;
		function tick() {
			if (!el) {
				rafId = requestAnimationFrame(tick);
				return;
			}
			const now = performance.now() / 1000;
			let bestValue = 0;
			let bestColor = defaultColor;

			for (let i = active.length - 1; i >= 0; i--) {
				const a = active[i];
				const elapsed = now - a.startedAt;
				if (elapsed > envelopeDuration(a.hold, adsr)) {
					active.splice(i, 1);
					continue;
				}
				const env = envelope(elapsed, a.hold, adsr) * a.velocity;
				if (env > bestValue) {
					bestValue = env;
					bestColor = a.color;
				}
			}

			el.style.opacity = String(bestValue * maxOpacity);
			el.style.backgroundColor = bestColor;
			rafId = requestAnimationFrame(tick);
		}
		tick();

		return () => {
			off();
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
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
