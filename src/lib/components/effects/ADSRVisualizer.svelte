<script lang="ts">
	import { onMount } from "svelte";
	import { lightshow } from "$lib/lightshow/store.svelte";
	import { envelope, envelopeDuration, type ADSR } from "$lib/lightshow/envelope";

	let {
		channel,
		adsr,
		hold = 0.2,
		color = "#7df9ff",
		width = 280,
		height = 80
	}: {
		channel: string | null;
		adsr: ADSR;
		hold?: number;
		color?: string;
		width?: number;
		height?: number;
	} = $props();

	let lastTriggerTime = $state<number | null>(null);
	let now = $state(performance.now() / 1000);

	onMount(() => {
		const off = lightshow.subscribe((trigger) => {
			if (channel && trigger.channel !== channel) return;
			lastTriggerTime = performance.now() / 1000;
		});

		let rafId: number | null = null;
		function tick() {
			now = performance.now() / 1000;
			rafId = requestAnimationFrame(tick);
		}
		tick();

		return () => {
			off();
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	});

	const PADDING = 4;
	let totalDuration = $derived(envelopeDuration(hold, adsr));
	let inner = $derived({ w: width - PADDING * 2, h: height - PADDING * 2 });

	function timeToX(t: number): number {
		if (totalDuration <= 0) return PADDING;
		return PADDING + (t / totalDuration) * inner.w;
	}
	function valueToY(v: number): number {
		return PADDING + (1 - v) * inner.h;
	}

	function noteOnValueLocal(t: number): number {
		const { attack, decay, sustain } = adsr;
		const s = Math.max(0, Math.min(1, sustain));
		if (attack > 0 && t < attack) return t / attack;
		const dt = t - attack;
		if (decay > 0 && dt < decay) return 1 - (1 - s) * (dt / decay);
		return s;
	}

	let path = $derived.by(() => {
		const { attack, decay, release } = adsr;
		const segments: string[] = [`M ${timeToX(0).toFixed(2)} ${valueToY(0).toFixed(2)}`];

		// Walk note-on phase: attack -> decay -> sustain, capped at hold
		const phaseEnds = [
			Math.min(attack, hold),
			Math.min(attack + decay, hold),
			hold
		];
		for (const t of phaseEnds) {
			segments.push(`L ${timeToX(t).toFixed(2)} ${valueToY(noteOnValueLocal(t)).toFixed(2)}`);
		}
		// Release: from value at hold down to 0
		const releaseStart = noteOnValueLocal(hold);
		segments.push(`L ${timeToX(hold).toFixed(2)} ${valueToY(releaseStart).toFixed(2)}`);
		segments.push(`L ${timeToX(hold + release).toFixed(2)} ${valueToY(0).toFixed(2)}`);

		return segments.join(" ");
	});

	let dotPos = $derived.by(() => {
		if (lastTriggerTime === null) return null;
		const elapsed = now - lastTriggerTime;
		if (elapsed > totalDuration) return null;
		const v = envelope(elapsed, hold, adsr);
		return { x: timeToX(elapsed), y: valueToY(v) };
	});

	let stagePoints = $derived.by(() => {
		const { attack, decay, release } = adsr;
		return [
			{ label: "A", x: timeToX(Math.min(attack, hold)) },
			{ label: "D", x: timeToX(Math.min(attack + decay, hold)) },
			{ label: "R", x: timeToX(hold + release) }
		];
	});
</script>

<svg {width} {height} class="adsr-svg">
	<rect x={0.5} y={0.5} width={width - 1} height={height - 1} class="frame" rx={3} />

	<line x1={PADDING} y1={valueToY(0)} x2={width - PADDING} y2={valueToY(0)} class="axis" />
	<line
		x1={PADDING}
		y1={valueToY(adsr.sustain)}
		x2={width - PADDING}
		y2={valueToY(adsr.sustain)}
		class="axis sustain-line"
	/>

	{#each stagePoints as p, i (i)}
		<line x1={p.x} y1={PADDING} x2={p.x} y2={height - PADDING} class="axis stage" />
		<text x={p.x + 2} y={PADDING + 8} class="stage-label">{p.label}</text>
	{/each}

	<path d={path} class="env-path" stroke={color} fill="none" />

	{#if dotPos}
		<circle cx={dotPos.x} cy={dotPos.y} r={4} fill={color} class="trigger-dot" />
	{/if}
</svg>

<style>
	.adsr-svg {
		display: block;
	}
	.frame {
		fill: rgba(255, 255, 255, 0.03);
		stroke: rgba(255, 255, 255, 0.15);
	}
	.axis {
		stroke: rgba(255, 255, 255, 0.1);
		stroke-width: 1;
	}
	.axis.stage {
		stroke-dasharray: 2 3;
	}
	.sustain-line {
		stroke: rgba(125, 249, 255, 0.15);
	}
	.stage-label {
		fill: rgba(255, 255, 255, 0.4);
		font-family: ui-monospace, monospace;
		font-size: 8px;
	}
	.env-path {
		stroke-width: 2;
		stroke-linejoin: round;
	}
	.trigger-dot {
		filter: drop-shadow(0 0 4px currentColor);
	}
</style>
