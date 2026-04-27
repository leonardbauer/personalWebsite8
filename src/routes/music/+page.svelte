<script>
	import textClip from "$lib/assets/textclip.png";
	import genDub from "$lib/assets/genDub.wav";
	import stabMidi from "$lib/assets/stab.mid?url";
	import kickMidi from "$lib/assets/Kick.mid?url";
	import drop1Midi from "$lib/assets/Drop1 Eh White Flash.mid?url";
	import { pageStyle } from "$lib/stores/pageStyle";
	import { player } from "$lib/stores/player.svelte";
	import { onMount, onDestroy } from "svelte";
    import MusicPlay from "./MusicPlay.svelte";
    import FlashWash from "$lib/components/effects/FlashWash.svelte";
    import LightshowDebug from "$lib/components/effects/LightshowDebug.svelte";
    import Timeline from "$lib/components/effects/Timeline.svelte";

	let bgX = $state(50);
	let bgY = $state(50);

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
		pageStyle.set({
			backgroundColor: "#1a1a2e",
			textColor: "#ffffff",
		});
		window.addEventListener("keydown", handleKeydown, { capture: true, passive: false });
		return () => window.removeEventListener("keydown", handleKeydown, { capture: true });
	});

	onDestroy(() => {
		pageStyle.set({
			backgroundColor: "#ffffff",
			textColor: "#000000",
		});
	});
</script>

<svelte:window onmousemove={handleMouseMove} />

<h1
	class="title drop-shadow-sm drop-shadow-[#ffffff8f]"
	style="background-image: url({textClip}); background-position: {bgX}% {bgY}%;"
>
	pfharmer
</h1>

<div class="mt-[50px]"></div>
<MusicPlay
	id="genDub"
	songName="genDub"
	color="#ff6b6b"
	src={genDub}
	midi={[stabMidi, kickMidi, drop1Midi]}
	midiOffsets={{}}
	bpm={125}
/>
<MusicPlay id="derifer" songName="Derifér" color="cyan" />
<MusicPlay id="konvolication" songName="Konvolication" color="blue" />
<MusicPlay id="kicove" songName="Kicove" color="green" />

<FlashWash
	channel="stab"
	defaultColor="#ff00aa"
	colors={{
		A3: "#ff00aa",
		A5: "#00ffaa",
		C4: "#ffd400",
		D4: "#00d4ff",
		E4: "#a64dff",
		F4: "#ff6b00",
		G3: "#ffffff"
	}}
/>
<FlashWash channel="kick" defaultColor="#ffffff" maxOpacity={0.7} decay={120} />
<FlashWash channel="drop1" defaultColor="#ffffff" maxOpacity={1} decay={800} />

<div class="mt-6 hidden md:block">
	<Timeline width={1200} height={240} />
</div>

<div class="hidden md:block">
	<LightshowDebug />
</div>

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
</style>
