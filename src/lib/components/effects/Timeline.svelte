<script lang="ts">
	import { player } from "$lib/stores/player.svelte";
	import { lightshow } from "$lib/lightshow/store.svelte";

	let {
		width = 900,
		height = 200,
		selectedChannel = null,
		onSelectChannel
	}: {
		width?: number;
		height?: number;
		selectedChannel?: string | null;
		onSelectChannel?: (name: string) => void;
	} = $props();

	let timelineEl: HTMLDivElement | undefined = $state();
	let scrubbing = $state(false);

	function seekFromEvent(e: PointerEvent) {
		if (!player.duration || !timelineEl) return;
		const rect = timelineEl.getBoundingClientRect();
		const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		player.seek(pct * player.duration);
	}

	function selectLaneFromEvent(e: PointerEvent) {
		if (!onSelectChannel || !timelineEl || !channelNames.length || !rowH) return;
		const rect = timelineEl.getBoundingClientRect();
		const y = e.clientY - rect.top - WAVE_HEIGHT;
		if (y < 0) return;
		const idx = Math.floor(y / rowH);
		if (idx >= 0 && idx < channelNames.length) {
			onSelectChannel(channelNames[idx]);
		}
	}

	function onPointerDown(e: PointerEvent) {
		scrubbing = true;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		seekFromEvent(e);
		selectLaneFromEvent(e);
	}

	function onPointerMove(e: PointerEvent) {
		if (!scrubbing) return;
		seekFromEvent(e);
	}

	function onPointerUp() {
		scrubbing = false;
	}

	const WAVE_HEIGHT = 60;
	const ROW_GAP = 4;

	let channelNames = $derived([...lightshow.channels.keys()].sort());
	let rowH = $derived(
		channelNames.length ? Math.max(16, (height - WAVE_HEIGHT - ROW_GAP) / channelNames.length) : 0
	);

	let canvas: HTMLCanvasElement | undefined = $state();

	$effect(() => {
		const buf = player.currentBuffer;
		if (!buf || !canvas) return;
		drawWaveform(canvas, buf, width, WAVE_HEIGHT);
	});

	function drawWaveform(c: HTMLCanvasElement, buf: AudioBuffer, w: number, h: number) {
		const dpr = window.devicePixelRatio || 1;
		c.width = w * dpr;
		c.height = h * dpr;
		c.style.width = w + "px";
		c.style.height = h + "px";
		const ctx = c.getContext("2d");
		if (!ctx) return;
		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, w, h);

		const data = buf.getChannelData(0);
		const samplesPerPixel = Math.floor(data.length / w);
		ctx.fillStyle = "rgba(125,249,255,0.6)";
		const mid = h / 2;
		for (let x = 0; x < w; x++) {
			const start = x * samplesPerPixel;
			let peak = 0;
			for (let i = 0; i < samplesPerPixel; i++) {
				const v = Math.abs(data[start + i] ?? 0);
				if (v > peak) peak = v;
			}
			const barH = peak * mid;
			ctx.fillRect(x, mid - barH, 1, barH * 2);
		}
	}

	function timeToX(t: number) {
		return player.duration ? (t / player.duration) * width : 0;
	}

	function fmt(t: number) {
		const m = Math.floor(t / 60);
		const s = (t % 60).toFixed(1);
		return `${m}:${s.padStart(4, "0")}`;
	}

	const colors = [
		"#ff00aa",
		"#7df9ff",
		"#ffd400",
		"#a64dff",
		"#ff6b00",
		"#00ffaa",
		"#ffffff"
	];
	function colorFor(idx: number) {
		return colors[idx % colors.length];
	}
</script>

<div
	class="timeline"
	style="width: {width}px;"
	bind:this={timelineEl}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	role="slider"
	tabindex="0"
	aria-label="seek timeline"
	aria-valuemin="0"
	aria-valuemax={player.duration}
	aria-valuenow={player.position}>
	<div class="wave-row" style="height: {WAVE_HEIGHT}px;">
		<canvas bind:this={canvas}></canvas>
		<div class="time-labels">
			<span>0:00.0</span>
			<span>{fmt(player.duration / 4)}</span>
			<span>{fmt(player.duration / 2)}</span>
			<span>{fmt((player.duration * 3) / 4)}</span>
			<span>{fmt(player.duration)}</span>
		</div>
	</div>

	{#each channelNames as name, idx (name)}
		{@const events = lightshow.channels.get(name) ?? []}
		{@const co = lightshow.channelOffsets[name] ?? 0}
		{@const color = colorFor(idx)}
		{@const muted = !!lightshow.muted[name]}
		{@const soloed = !!lightshow.soloed[name]}
		<div
			class="row"
			class:selected={selectedChannel === name}
			class:muted
			style="height: {rowH}px;"
		>
			<div class="row-label" style="color: {color}">{name}</div>
			{#each events as e, i (i)}
				{@const audioTime = (e.time + co) * lightshow.timeScale}
				<div
					class="tick"
					style="left: {timeToX(audioTime)}px; background: {color}; opacity: {0.4 + 0.6 * e.velocity};"
					title="{e.noteName} @ {audioTime.toFixed(3)}s · v{e.velocity.toFixed(2)}"
				></div>
			{/each}
			<div class="row-controls">
				<button
					type="button"
					class="ms-btn"
					class:active={muted}
					title="mute (0)"
					onpointerdown={(e) => {
						e.stopPropagation();
						lightshow.toggleMute(name);
					}}
				>M</button>
				<button
					type="button"
					class="ms-btn solo"
					class:active={soloed}
					title="solo (s)"
					onpointerdown={(e) => {
						e.stopPropagation();
						lightshow.toggleSolo(name);
					}}
				>S</button>
			</div>
		</div>
	{/each}

	<div class="playhead" style="left: {timeToX(player.position)}px;"></div>
</div>

<style>
	.timeline {
		position: relative;
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		font-family: ui-monospace, monospace;
		font-size: 10px;
		color: rgba(255, 255, 255, 0.8);
		overflow: hidden;
		cursor: ew-resize;
		touch-action: none;
		user-select: none;
	}
	.wave-row {
		position: relative;
		border-bottom: 1px solid rgba(255, 255, 255, 0.15);
	}
	canvas {
		display: block;
	}
	.time-labels {
		position: absolute;
		inset: 0;
		display: flex;
		justify-content: space-between;
		padding: 2px 4px;
		pointer-events: none;
		opacity: 0.5;
	}
	.row {
		position: relative;
		border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
	}
	.row.selected {
		background: rgba(255, 255, 255, 0.12);
	}
	.row.muted .tick {
		opacity: 0.15 !important;
	}
	.row-controls {
		position: absolute;
		right: 4px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		gap: 2px;
		z-index: 4;
	}
	.ms-btn {
		width: 18px;
		height: 18px;
		padding: 0;
		font-size: 9px;
		font-weight: 700;
		font-family: ui-monospace, monospace;
		background: rgba(0, 0, 0, 0.6);
		color: rgba(255, 255, 255, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 2px;
		cursor: pointer;
		line-height: 1;
	}
	.ms-btn:hover {
		background: rgba(255, 255, 255, 0.15);
	}
	.ms-btn.active {
		background: #ff6b6b;
		color: #000;
		border-color: #ff6b6b;
	}
	.ms-btn.solo.active {
		background: #ffd400;
		border-color: #ffd400;
	}
	.row-label {
		position: absolute;
		left: 4px;
		top: 2px;
		z-index: 2;
		font-size: 10px;
	}
	.tick {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
	}
	.playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: #ff4040;
		pointer-events: none;
		z-index: 3;
	}
</style>
