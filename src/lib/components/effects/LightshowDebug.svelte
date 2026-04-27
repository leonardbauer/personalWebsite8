<script lang="ts">
	import { untrack } from "svelte";
	import { player } from "$lib/stores/player.svelte";
	import { lightshow } from "$lib/lightshow/store.svelte";
	import type { Trigger } from "$lib/lightshow/types";

	let { historyLength = 8 }: { historyLength?: number } = $props();

	let history = $state<Array<Trigger & { age: number }>>([]);

	$effect(() => {
		const trigger = lightshow.lastTrigger;
		if (!trigger) return;
		const prev = untrack(() => history);
		history = [{ ...trigger, age: 0 }, ...prev].slice(0, historyLength);
	});

	let now = $state(performance.now());
	let rafId: number;
	$effect(() => {
		const tick = () => {
			now = performance.now();
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	});

	function fmt(t: number): string {
		const m = Math.floor(t / 60);
		const s = (t % 60).toFixed(2);
		return `${m}:${s.padStart(5, "0")}`;
	}

	let channelNames = $derived([...lightshow.channels.keys()].sort());
</script>

<div class="debug">
	<div class="row">
		<span class="label">song</span>
		<span class="value">{fmt(player.position)} / {fmt(player.duration)}</span>
	</div>
	<div class="row">
		<span class="label">offset</span>
		<span class="value">{(lightshow.offset * 1000).toFixed(0)}ms</span>
	</div>
	<div class="row">
		<span class="label">bpm</span>
		<span class="value">
			{lightshow.bpm || "—"}
			{#if lightshow.midiBpm && lightshow.bpm && Math.abs(lightshow.midiBpm - lightshow.bpm) > 0.001}
				· midi {lightshow.midiBpm.toFixed(2)} (rescaled)
			{/if}
		</span>
	</div>

	<div class="hr"></div>

	{#each channelNames as name (name)}
		{@const next = lightshow.nextEvent(name)}
		{@const co = lightshow.channelOffsets[name] ?? 0}
		<div class="row">
			<span class="label" style="color: var(--accent)">{name}</span>
			<span class="value">
				{lightshow.pulseCount[name] ?? 0} fired
				{#if co !== 0} · off {co.toFixed(2)}s{/if}
			</span>
		</div>
		{#if next}
			<div class="row sub">
				<span class="label">↳ next</span>
				<span class="value">{next.noteName} @ {fmt(next.time + co)}</span>
			</div>
		{/if}
	{/each}

	<div class="hr"></div>

	<div class="history">
		{#each history as h, i (`${h.firedAt}-${i}`)}
			{@const ageMs = now - h.firedAt}
			<div class="event" style="opacity: {Math.max(0.2, 1 - ageMs / 4000)}">
				<span class="event-channel">{h.channel}</span>
				<span class="event-note">{h.event.noteName}</span>
				<span class="event-time">{fmt(h.event.time)}</span>
				<span class="event-vel">v{h.event.velocity.toFixed(2)}</span>
				<span class="event-age">{ageMs.toFixed(0)}ms</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.debug {
		position: fixed;
		top: 10px;
		right: 10px;
		z-index: 100;
		background: rgba(0, 0, 0, 0.85);
		color: #fff;
		font-family: ui-monospace, monospace;
		font-size: 11px;
		padding: 10px 12px;
		border-radius: 6px;
		min-width: 240px;
		max-width: 320px;
		pointer-events: none;
		--accent: #7df9ff;
	}
	.row {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		line-height: 1.5;
	}
	.label {
		opacity: 0.6;
	}
	.row.sub .label,
	.row.sub .value {
		opacity: 0.5;
		font-size: 10px;
	}
	.value {
		font-variant-numeric: tabular-nums;
	}
	.hr {
		height: 1px;
		background: rgba(255, 255, 255, 0.15);
		margin: 6px 0;
	}
	.history {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.event {
		display: grid;
		grid-template-columns: auto 1fr auto auto auto;
		gap: 8px;
		font-variant-numeric: tabular-nums;
	}
	.event-channel {
		color: var(--accent);
	}
	.event-age {
		opacity: 0.5;
	}
</style>
