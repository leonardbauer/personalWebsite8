<script>
	import Icon from "@iconify/svelte";
	import { player } from "$lib/stores/player.svelte";
	import genDub from "$lib/assets/genDub.wav";

	let {
		id = "konvolication",
		songName = "Konvolication Pfharmer",
		meta = null,
		color = "#ff6b6b",
		src = genDub,
		bpm = null,
		midi = null,
		midiOffsets = {}
	} = $props();

	let trackEl;
	let isSeeking = $state(false);
	let displayPosition = $state(0);

	let isOn = $derived(player.current === id);
	let isLoading = $derived(player.loading === id);
	let songlength = $derived(isOn ? player.duration : 0);
	let songposition = $derived(
		isSeeking ? displayPosition : (isOn ? Math.floor(player.position) : 0)
	);
	let timeMeta = $derived(isOn && songlength
		? `${Math.floor(songposition)}s / ${Math.floor(songlength)}s`
		: null);

	$effect(() => {
		player.register(id, { src, bpm, midi, midiOffsets });
	});

	let toggle = () => player.toggle(id);

	function seekFromPointer(clientX) {
		if (!songlength || !trackEl) return;
		const rect = trackEl.getBoundingClientRect();
		const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		const t = pct * songlength;
		player.seek(t);
		displayPosition = t;
	}

	function onPointerDown(e) {
		if (!isOn) return;
		isSeeking = true;
		e.currentTarget.setPointerCapture(e.pointerId);
		seekFromPointer(e.clientX);
	}

	function onPointerMove(e) {
		if (!isSeeking) return;
		seekFromPointer(e.clientX);
	}

	function onPointerUp() {
		if (!isSeeking) return;
		requestAnimationFrame(() => requestAnimationFrame(() => {
			isSeeking = false;
		}));
	}
</script>

<div class="h-[50px] w-full flex flex-row items-center gap-5">
	<button
		onclick={toggle}
		disabled={isLoading}
		class="bg-[#1a1a1aea] rounded-sm w-10 h-10 flex items-center justify-center text-white disabled:opacity-60"
		aria-label={isLoading ? "loading" : isOn ? "pause" : "play"}
	>
		<Icon
			icon={isLoading ? "lucide:loader-2" : isOn ? "lucide:pause" : "lucide:play"}
			width={20}
			class={isLoading ? "animate-spin" : ""}
		/>
	</button>

	<div class="w-full flex-col">
		<div>
			{songName}{#if meta}<span class="meta">{meta}</span>{/if}{#if timeMeta}<span class="meta">{timeMeta}</span>{/if}
		</div>
		<div
			bind:this={trackEl}
			class="song-progress bg-[#ffffff33] w-full rounded-full h-2 overflow-hidden cursor-pointer touch-none"
			role="slider"
			tabindex="0"
			aria-valuemin="0"
			aria-valuemax={songlength}
			aria-valuenow={songposition}
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
		>
			<div
				class="song-progress-fill h-full rounded-full"
				style="width: {songlength ? (songposition / songlength) * 100 : 0}%; background-color: {color}; transition-duration: {isSeeking ? '0ms' : '1000ms'};"
			></div>
		</div>
	</div>
</div>

<style>
	.song-progress-fill {
		transition: width linear;
	}
	.meta {
		color: #888;
		margin-left: 0.5em;
		font-size: 0.85em;
	}
</style>
