<script lang="ts">
	import { onMount } from "svelte";
	import { player } from "$lib/stores/player.svelte";
	import { evaluateLane, type AutomationLane } from "$lib/lightshow/automation";
	import type { ADSR } from "$lib/lightshow/envelope";
	import MusicPlay from "../../../routes/music/MusicPlay.svelte";
	import FlashWash from "./FlashWash.svelte";
	import Strobe from "./Strobe.svelte";
	import ShaderBloom from "./ShaderBloom.svelte";

	type EffectType = "flash" | "strobe" | "pulse" | "bloom";

	type ChannelDef = {
		name: string;
		midi: string | null;
		color: string;
		noteColors: Record<string, string>;
		maxOpacity: number;
		adsr: ADSR;
		offset: number;
		effect: EffectType;
		strobeSubdivisions: number;
		automations: Record<string, AutomationLane>;
	};

	type ShowDef = {
		showName: string;
		bpm: number;
		audio: string;
		channels: ChannelDef[];
	};

	let {
		src,
		songName,
		color = "#ff6b6b"
	}: { src: string; songName?: string; color?: string } = $props();

	let show = $state<ShowDef | null>(null);
	let loadError = $state<string | null>(null);

	const baseUrl = $derived(src.replace(/\/[^/]+$/, ""));
	const playerId = $derived(show ? `show:${show.showName}` : "");

	function resolveUrl(value: string, kind: "audio" | "midi") {
		if (/^https?:\/\//.test(value)) return value;
		return kind === "midi" ? `${baseUrl}/midi/${value}` : `${baseUrl}/${value}`;
	}

	const audioUrl = $derived(show ? resolveUrl(show.audio, "audio") : "");
	const midiEntries = $derived(
		show
			? show.channels
					.filter((c) => c.midi)
					.map((c) => ({ url: resolveUrl(c.midi as string, "midi"), name: c.name }))
			: []
	);
	const midiOffsets = $derived.by(() => {
		const out: Record<string, number> = {};
		if (show) for (const c of show.channels) if (c.offset !== 0) out[c.name] = c.offset;
		return out;
	});

	onMount(async () => {
		try {
			const res = await fetch(src);
			if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
			show = (await res.json()) as ShowDef;
		} catch (e) {
			loadError = e instanceof Error ? e.message : String(e);
			console.error("[LightShow] load failed", e);
		}
	});
</script>

{#if show}
	<MusicPlay
		id={playerId}
		songName={songName ?? show.showName}
		meta={show.bpm ? `${show.bpm} BPM` : null}
		{color}
		src={audioUrl}
		midi={midiEntries}
		{midiOffsets}
		bpm={show.bpm}
	/>

	{#each show.channels as ch (ch.name)}
		{@const effMaxOpacity =
			evaluateLane(ch.automations.maxOpacity, player.position) ?? ch.maxOpacity}
		{@const effSub =
			evaluateLane(ch.automations.strobeSubdivisions, player.position) ?? ch.strobeSubdivisions}
		{#if ch.effect === "flash"}
			<FlashWash
				channel={ch.name}
				defaultColor={ch.color}
				colors={ch.noteColors}
				maxOpacity={effMaxOpacity}
				adsr={ch.adsr}
			/>
		{:else if ch.effect === "strobe"}
			<Strobe channel={ch.name} color={ch.color} subdivisions={effSub} bpm={show.bpm} />
		{:else if ch.effect === "bloom"}
			<ShaderBloom
				channel={ch.name}
				color={ch.color}
				colors={ch.noteColors}
				adsr={ch.adsr}
				maxIntensity={effMaxOpacity}
			/>
		{/if}
	{/each}
{:else if loadError}
	<div class="error">Failed to load show: {loadError}</div>
{/if}

<style>
	.error {
		color: #ff6b6b;
		font-size: 12px;
		opacity: 0.7;
	}
</style>
