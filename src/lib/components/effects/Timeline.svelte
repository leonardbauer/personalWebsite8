<script lang="ts">
	import { onMount } from "svelte";
	import { player } from "$lib/stores/player.svelte";
	import { lightshow } from "$lib/lightshow/store.svelte";
	import type { AutomationLane, Breakpoint } from "$lib/lightshow/automation";

	export type AutomationView = {
		channelName: string;
		param: string;
		min: number;
		max: number;
		lane: AutomationLane;
		color: string;
		values?: number[];
		logScale?: boolean;
	};

	let {
		width = 900,
		height = 200,
		selectedChannel = null,
		onSelectChannel,
		automations = [],
		onMoveBreakpoint,
		onAddBreakpoint,
		onRemoveBreakpoint
	}: {
		width?: number;
		height?: number;
		selectedChannel?: string | null;
		onSelectChannel?: (name: string) => void;
		automations?: AutomationView[];
		onMoveBreakpoint?: (channel: string, param: string, idx: number, time: number, value: number) => void;
		onAddBreakpoint?: (channel: string, param: string, time: number, value: number) => void;
		onRemoveBreakpoint?: (channel: string, param: string, idx: number) => void;
	} = $props();

	let timelineEl: HTMLDivElement | undefined = $state();
	let channelsEl: HTMLDivElement | undefined = $state();
	let scrubbing = $state(false);

	let zoomX = $state(1);
	let panX = $state(0);
	let rowHMult = $state<Record<string, number>>({});
	let activeResizeRow: string | null = null;
	let resizeIdleTimer: ReturnType<typeof setTimeout> | null = null;

	let viewDuration = $derived((player.duration || 60) / zoomX);
	let viewStart = $derived(panX);

	function clampPan() {
		const total = player.duration || 0;
		const max = Math.max(0, total - viewDuration);
		panX = Math.max(0, Math.min(max, panX));
	}

	function seekFromEvent(e: PointerEvent) {
		if (!player.duration || !timelineEl) return;
		const rect = timelineEl.getBoundingClientRect();
		const t = xToTime(e.clientX - rect.left);
		player.seek(Math.max(0, Math.min(player.duration, t)));
	}

	function selectLaneFromEvent(e: PointerEvent) {
		if (!onSelectChannel || !channelsEl) return;
		const rect = channelsEl.getBoundingClientRect();
		const y = e.clientY - rect.top + channelsEl.scrollTop;
		if (y < 0) return;
		const found = findRowAt(y);
		if (found && found.row.kind === "channel") onSelectChannel(found.row.name);
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

	onMount(() => {
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.key === "Alt" || e.altKey === false) {
				activeResizeRow = null;
				if (resizeIdleTimer) clearTimeout(resizeIdleTimer);
				resizeIdleTimer = null;
			}
		};
		window.addEventListener("keyup", onKeyUp);
		return () => window.removeEventListener("keyup", onKeyUp);
	});

	const WAVE_HEIGHT = 60;
	const ROW_GAP = 4;

	let channelNames = $derived([...lightshow.channels.keys()].sort());

	type LayoutRow =
		| { kind: "channel"; name: string; idx: number; color: string }
		| { kind: "auto"; view: AutomationView };

	let layout = $derived.by(() => {
		const rows: LayoutRow[] = [];
		for (let idx = 0; idx < channelNames.length; idx++) {
			const name = channelNames[idx];
			rows.push({ kind: "channel", name, idx, color: colorFor(idx) });
			for (const view of automations) {
				if (view.channelName === name) rows.push({ kind: "auto", view });
			}
		}
		return rows;
	});

	const BASE_ROW = 30;

	function rowKey(r: LayoutRow): string {
		return r.kind === "channel"
			? `ch:${r.name}`
			: `auto:${r.view.channelName}:${r.view.param}`;
	}

	let layoutWithHeights = $derived.by(() => {
		const out: Array<LayoutRow & { h: number }> = [];
		for (const r of layout) {
			const mult = rowHMult[rowKey(r)] ?? 1;
			const h = Math.max(14, BASE_ROW * mult);
			out.push({ ...r, h });
		}
		return out;
	});

	let rowH = $derived(BASE_ROW);

	function findRowAt(y: number): { row: LayoutRow & { h: number }; localY: number } | null {
		let acc = 0;
		for (const r of layoutWithHeights) {
			if (y >= acc && y < acc + r.h) return { row: r, localY: y - acc };
			acc += r.h;
		}
		return null;
	}

	function onWheel(e: WheelEvent) {
		if (!timelineEl) return;
		if (e.ctrlKey) {
			e.preventDefault();
			const rect = timelineEl.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseTime = xToTime(mouseX);
			const factor = Math.exp(-e.deltaY * 0.01);
			const newZoom = Math.max(1, Math.min(100, zoomX * factor));
			const newDur = (player.duration || 60) / newZoom;
			panX = mouseTime - (mouseX / width) * newDur;
			zoomX = newZoom;
			clampPan();
			return;
		}
		if (e.altKey && channelsEl) {
			e.preventDefault();
			if (!activeResizeRow) {
				const rect = channelsEl.getBoundingClientRect();
				const yLocal = e.clientY - rect.top + channelsEl.scrollTop;
				const found = findRowAt(yLocal);
				if (found) activeResizeRow = rowKey(found.row);
			}
			if (activeResizeRow) {
				const cur = rowHMult[activeResizeRow] ?? 1;
				const factor = Math.exp(-e.deltaY * 0.005);
				rowHMult = {
					...rowHMult,
					[activeResizeRow]: Math.max(0.5, Math.min(12, cur * factor))
				};
			}
			if (resizeIdleTimer) clearTimeout(resizeIdleTimer);
			resizeIdleTimer = setTimeout(() => {
				activeResizeRow = null;
			}, 300);
			return;
		}
		activeResizeRow = null;

		// Horizontal pan when zoomed in: trackpad deltaX or shift+deltaY
		const horizontalDelta = e.deltaX !== 0 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
		if (horizontalDelta !== 0 && zoomX > 1) {
			e.preventDefault();
			const dt = (horizontalDelta / width) * viewDuration;
			panX += dt;
			clampPan();
		}
		// otherwise: native vertical scroll on .channels-area
	}

	let canvas: HTMLCanvasElement | undefined = $state();

	$effect(() => {
		const buf = player.currentBuffer;
		if (!buf || !canvas) return;
		drawWaveform(canvas, buf, width, WAVE_HEIGHT, viewStart, viewStart + viewDuration);
	});

	function drawWaveform(
		c: HTMLCanvasElement,
		buf: AudioBuffer,
		w: number,
		h: number,
		startSec: number,
		endSec: number
	) {
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
		const sr = buf.sampleRate;
		const startSample = Math.max(0, Math.floor(startSec * sr));
		const endSample = Math.min(data.length, Math.floor(endSec * sr));
		const samplesInView = Math.max(1, endSample - startSample);
		const samplesPerPixel = Math.max(1, Math.floor(samplesInView / w));
		ctx.fillStyle = "rgba(125,249,255,0.6)";
		const mid = h / 2;
		for (let x = 0; x < w; x++) {
			const sStart = startSample + x * samplesPerPixel;
			let peak = 0;
			for (let i = 0; i < samplesPerPixel; i++) {
				const v = Math.abs(data[sStart + i] ?? 0);
				if (v > peak) peak = v;
			}
			const barH = peak * mid;
			ctx.fillRect(x, mid - barH, 1, barH * 2);
		}
	}

	function timeToX(t: number) {
		if (viewDuration <= 0) return 0;
		return ((t - viewStart) / viewDuration) * width;
	}

	function xToTime(x: number) {
		return viewStart + (x / width) * viewDuration;
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

	function valueToFraction(v: number, view: AutomationView): number {
		if (view.logScale && view.min > 0 && view.max > 0) {
			const lmin = Math.log2(view.min);
			const lmax = Math.log2(view.max);
			return (Math.log2(Math.max(v, 1e-6)) - lmin) / (lmax - lmin);
		}
		const range = view.max - view.min;
		if (range <= 0) return 0;
		return (v - view.min) / range;
	}

	function fractionToValue(t: number, view: AutomationView): number {
		if (view.logScale && view.min > 0 && view.max > 0) {
			const lmin = Math.log2(view.min);
			const lmax = Math.log2(view.max);
			return Math.pow(2, lmin + t * (lmax - lmin));
		}
		return view.min + t * (view.max - view.min);
	}

	function valueToY(value: number, view: AutomationView, h: number): number {
		const t = valueToFraction(value, view);
		return 4 + (1 - t) * (h - 8);
	}

	function yToValue(y: number, view: AutomationView, h: number): number {
		const t = 1 - (y - 4) / (h - 8);
		const clampedT = Math.max(0, Math.min(1, t));
		const v = fractionToValue(clampedT, view);
		if (view.values && view.values.length) {
			let nearest = view.values[0];
			let bestDist = Math.abs(Math.log2(Math.max(v, 1e-6)) - Math.log2(Math.max(nearest, 1e-6)));
			for (const candidate of view.values) {
				const dist = view.logScale
					? Math.abs(Math.log2(Math.max(v, 1e-6)) - Math.log2(Math.max(candidate, 1e-6)))
					: Math.abs(v - candidate);
				if (dist < bestDist) {
					bestDist = dist;
					nearest = candidate;
				}
			}
			return nearest;
		}
		return v;
	}

	function buildAutoPath(view: AutomationView, h: number): string {
		const bps = view.lane.breakpoints;
		if (!bps.length || !player.duration) return "";
		const parts: string[] = [];
		const startY = valueToY(bps[0].value, view, h);
		parts.push(`M ${timeToX(0)} ${startY}`);
		parts.push(`L ${timeToX(bps[0].time)} ${startY}`);
		for (let i = 1; i < bps.length; i++) {
			const x = timeToX(bps[i].time);
			const yPrev = valueToY(bps[i - 1].value, view, h);
			const yCur = valueToY(bps[i].value, view, h);
			if (bps[i - 1].curve === "hold") {
				parts.push(`L ${x} ${yPrev}`);
				parts.push(`L ${x} ${yCur}`);
			} else {
				parts.push(`L ${x} ${yCur}`);
			}
		}
		const lastY = valueToY(bps[bps.length - 1].value, view, h);
		parts.push(`L ${width} ${lastY}`);
		return parts.join(" ");
	}

	function startDragBp(e: PointerEvent, view: AutomationView, bpIdx: number) {
		e.stopPropagation();
		const target = e.currentTarget as Element;
		const rowEl = target.closest(".auto-row") as HTMLElement | null;
		if (!rowEl || !timelineEl) return;
		(target as Element & { setPointerCapture(id: number): void }).setPointerCapture(e.pointerId);
		const timelineRect = timelineEl.getBoundingClientRect();
		const rowRect = rowEl.getBoundingClientRect();
		const move = (ev: PointerEvent) => {
			const x = ev.clientX - timelineRect.left;
			const t = player.duration ? Math.max(0, (x / width) * player.duration) : 0;
			const yLocal = ev.clientY - rowRect.top;
			const v = yToValue(yLocal, view, rowRect.height);
			onMoveBreakpoint?.(view.channelName, view.param, bpIdx, t, v);
		};
		const up = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
	}

	function onAutoLaneDown(e: PointerEvent, view: AutomationView) {
		if ((e.target as HTMLElement)?.classList?.contains?.("bp")) return;
		e.stopPropagation();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const t = player.duration ? Math.max(0, (x / rect.width) * player.duration) : 0;
		const v = yToValue(y, view, rect.height);
		onAddBreakpoint?.(view.channelName, view.param, t, v);
	}
</script>

<div
	class="timeline"
	style="width: {width}px; height: {height}px;"
	bind:this={timelineEl}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	onwheel={onWheel}
	role="slider"
	tabindex="0"
	aria-label="seek timeline"
	aria-valuemin="0"
	aria-valuemax={player.duration}
	aria-valuenow={player.position}>
	<div class="wave-row" style="height: {WAVE_HEIGHT}px;">
		<canvas bind:this={canvas}></canvas>
		<div class="time-labels">
			<span>{fmt(viewStart)}</span>
			<span>{fmt(viewStart + viewDuration / 4)}</span>
			<span>{fmt(viewStart + viewDuration / 2)}</span>
			<span>{fmt(viewStart + (viewDuration * 3) / 4)}</span>
			<span>{fmt(viewStart + viewDuration)}</span>
		</div>
	</div>

	<div class="channels-area" bind:this={channelsEl}>

	{#each layoutWithHeights as row, rowIdx (rowIdx)}
		{#if row.kind === "channel"}
			{@const name = row.name}
			{@const events = lightshow.channels.get(name) ?? []}
			{@const co = lightshow.channelOffsets[name] ?? 0}
			{@const color = row.color}
			{@const muted = !!lightshow.muted[name]}
			{@const soloed = !!lightshow.soloed[name]}
			<div
				class="row"
				class:selected={selectedChannel === name}
				class:muted
				style="height: {row.h}px;"
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
		{:else}
			{@const view = row.view}
			{@const path = buildAutoPath(view, row.h)}
			<div
				class="row auto-row"
				style="height: {row.h}px;"
				onpointerdown={(e) => onAutoLaneDown(e, view)}
				role="presentation"
			>
				<div class="row-label auto-label" style="color: {view.color}">
					↳ {view.param}
				</div>
				<svg
					class="auto-svg"
					width={width}
					height={row.h}
					viewBox="0 0 {width} {row.h}"
					preserveAspectRatio="none"
				>
					{#if view.values}
						{#each view.values as v (v)}
							{@const gy = valueToY(v, view, row.h)}
							<line
								x1={0}
								y1={gy}
								x2={width}
								y2={gy}
								stroke="rgba(255,255,255,0.07)"
								stroke-width="1"
								stroke-dasharray="2 4"
							/>
						{/each}
					{/if}
					<path d={path} stroke={view.color} fill="none" stroke-width="1.5" />
					{#each view.lane.breakpoints as bp, bpIdx (bpIdx)}
						{@const bpX = timeToX(bp.time)}
						{@const bpY = valueToY(bp.value, view, row.h)}
						<circle
							cx={bpX}
							cy={bpY}
							r={4}
							fill={view.color}
							class="bp"
							onpointerdown={(e) => startDragBp(e, view, bpIdx)}
							ondblclick={(e) => {
								e.stopPropagation();
								onRemoveBreakpoint?.(view.channelName, view.param, bpIdx);
							}}
						/>
					{/each}
				</svg>
			</div>
		{/if}
	{/each}
	</div>

	<div class="playhead" style="left: {timeToX(player.position)}px;"></div>
</div>

<style>
	.timeline {
		position: relative;
		display: flex;
		flex-direction: column;
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
	.channels-area {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
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
	.auto-row {
		background: rgba(255, 255, 255, 0.03);
		cursor: crosshair;
	}
	.auto-svg {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.auto-svg .bp {
		pointer-events: auto;
		cursor: grab;
	}
	.auto-svg .bp:active {
		cursor: grabbing;
	}
	.auto-label {
		opacity: 0.6;
		font-size: 9px;
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
