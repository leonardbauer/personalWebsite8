<script>
	import textClip from "$lib/assets/textclip.png";
	import genDub from "$lib/assets/genDub.wav";
	import stabMidi from "$lib/assets/stab.mid?url";
	import kickMidi from "$lib/assets/Kick.mid?url";
	import drop1Midi from "$lib/assets/Drop1 Eh White Flash.mid?url";
	import { pageStyle } from "$lib/stores/pageStyle";
	import { player } from "$lib/stores/player.svelte";
	import { lightshow } from "$lib/lightshow/store.svelte";
	import { onMount, onDestroy } from "svelte";
	import MusicPlay from "./MusicPlay.svelte";
	import EpilepsyModal from "./EpilepsyModal.svelte";
	import FlashWash from "$lib/components/effects/FlashWash.svelte";
	import LightShow from "$lib/components/effects/LightShow.svelte";
	import LightshowDebug from "$lib/components/effects/LightshowDebug.svelte";
	import Timeline from "$lib/components/effects/Timeline.svelte";

	let { data } = $props();
	let bgX = $state(50);
	let bgY = $state(50);

	let beatSeconds = $derived(lightshow.bpm > 0 ? 60 / lightshow.bpm : 0.5);
	let isPlaying = $derived(player.current !== null);

	function handleMouseMove(event) {
		const x = (event.clientX / window.innerWidth) * 100;
		const y = (event.clientY / window.innerHeight) * 100;
		bgX = 25 + x * 0.5;
		bgY = 25 + y * 0.5;
	}

	function handleKeydown(event) {
		if (event.code !== "Space" && event.key !== " ") return;
		const target = event.target;
		if (target instanceof HTMLElement) {
			const tag = target.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
		}
		event.preventDefault();
		event.stopPropagation();
		if (target instanceof HTMLButtonElement) target.blur();
		player.togglePlayPause();
	}

	onMount(() => {
		pageStyle.set({ backgroundColor: "#1a1a2e", textColor: "#ffffff" });
		document.body.classList.add("force-dark-music");
		player.loadEpilepsyAck();
		window.addEventListener("keydown", handleKeydown, { capture: true, passive: false });
		return () => window.removeEventListener("keydown", handleKeydown, { capture: true });
	});

	onDestroy(() => {
		if (typeof document === "undefined") return;
		pageStyle.set({ backgroundColor: "#ffffff", textColor: "#000000" });
		document.body.classList.remove("force-dark-music");
	});
</script>

<svelte:window onmousemove={handleMouseMove} />

<h1
	class="title drop-shadow-sm drop-shadow-[#ffffff8f]"
	class:pulse={isPlaying}
	style="background-image: url({textClip}); background-position: {bgX}% {bgY}%; --beat: {beatSeconds}s;"
>
	pfharmer
</h1>

<div class="volume-row">
	<span class="volume-label">vol</span>
	<input
		type="range"
		min="0"
		max="1"
		step="0.01"
		value={player.volume}
		oninput={(e) => player.setVolume(Number(e.currentTarget.value))}
		aria-label="Volume"
	/>
	<span class="volume-value">{Math.round(player.volume * 100)}</span>
</div>

<p class="epilepsy-warning" role="note">
	⚠ photosensitivity warning — playback drives full-screen flashes and strobes
</p>

<EpilepsyModal />

<div class="mt-[50px]"></div>
<!-- <MusicPlay -->
<!-- 	id="genDub" -->
<!-- 	songName="genDub" -->
<!-- 	color="#ff6b6b" -->
<!-- 	src={genDub} -->
<!-- 	midi={[stabMidi, kickMidi, drop1Midi]} -->
<!-- 	midiOffsets={{}} -->
<!-- 	bpm={125} -->
<!-- /> -->
<!-- <MusicPlay id="derifer" songName="Derifér" color="cyan" /> -->
<!-- <MusicPlay id="konvolication" songName="Konvolication" color="blue" /> -->
<!-- <MusicPlay id="kicove" songName="Kicove" color="green" /> -->
<!---->
<!-- <FlashWash -->
<!-- 	channel="stab" -->
<!-- 	defaultColor="#ff00aa" -->
<!-- 	colors={{ -->
<!-- 		A3: "#ff00aa", -->
<!-- 		A5: "#00ffaa", -->
<!-- 		C4: "#ffd400", -->
<!-- 		D4: "#00d4ff", -->
<!-- 		E4: "#a64dff", -->
<!-- 		F4: "#ff6b00", -->
<!-- 		G3: "#ffffff" -->
<!-- 	}} -->
<!-- /> -->
<!-- <FlashWash channel="kick" defaultColor="#ffffff" maxOpacity={0.7} /> -->
<!-- <FlashWash channel="drop1" defaultColor="#ffffff" maxOpacity={1} /> -->

{#if data?.shows}
	{#each data.shows as s (s.name)}
		<LightShow src="/api/shows/{s.name}" songName={s.title} color="#ff6b6b" />
		{#if s.artist || s.tags.length}
			<div class="show-meta">
				{#if s.artist}<span>{s.artist}</span>{/if}
				{#each s.tags as tag (tag)}<span class="tag">{tag}</span>{/each}
			</div>
		{/if}
	{/each}
{/if}

<style>
	.title {
		font-family: "eight", sans-serif;
		font-weight: 400;
		font-size: clamp(2rem, 14vw, 10rem);
		line-height: 1;
		font-style: normal;
		background-size: 150%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		text-shadow: 0px 0px 5px #0000007f;

		transition: transform 400ms cubic-bezier(1,0,0,1.65), background 100ms cubic-bezier(.32,0,.53,1.48);
	}
	@media (hover: hover) {
		.title:hover {
			transform: scale(1.2) translateX(clamp(0px, 8vw, 120px));
		}
	}
	.title.pulse {
		animation: title-pulse var(--beat, 0.5s) cubic-bezier(0, 0.6, 0.3, 1) infinite;
		transform-origin: left center;
	}
	@keyframes title-pulse {
		0% { transform: scale(1.025); filter: brightness(1.15); }
		100% { transform: scale(1); filter: brightness(1); }
	}
	.show-meta {
		display: flex;
		gap: 8px;
		font-size: 11px;
		opacity: 0.6;
		font-family: ui-monospace, monospace;
		margin: 4px 0 12px 56px;
	}
	.show-meta .tag {
		background: rgba(255, 255, 255, 0.08);
		padding: 1px 6px;
		border-radius: 999px;
		font-size: 10px;
	}
	.volume-row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 16px;
		font-family: ui-monospace, monospace;
		font-size: 12px;
		color: #aaa;
	}
	.volume-row input[type="range"] {
		flex: 0 0 200px;
		accent-color: #ff6b6b;
	}
	.volume-value {
		min-width: 24px;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.epilepsy-warning {
		margin-top: 8px;
		font-family: ui-monospace, monospace;
		font-size: 11px;
		color: #ffb84d;
		opacity: 0.85;
	}
</style>
