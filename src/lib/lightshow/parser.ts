import * as TonejsMidi from "@tonejs/midi";
import type { ChannelMap, ChannelEvent } from "./types";

const Midi = (TonejsMidi as { Midi: typeof TonejsMidi.Midi }).Midi;

export async function loadMidi(
	source: string | File | Blob,
	fallbackChannelName?: string
): Promise<{ channels: ChannelMap; bpm: number | null; tempos: Array<{ time: number; bpm: number }> }> {
	let buf: ArrayBuffer;
	let label: string;
	if (typeof source === "string") {
		const res = await fetch(source);
		if (!res.ok) throw new Error(`MIDI fetch failed: ${res.status}`);
		buf = await res.arrayBuffer();
		label = source;
	} else {
		buf = await source.arrayBuffer();
		label = (source as File).name ?? "[blob]";
	}
	const midi = new Midi(buf);

	const channels: ChannelMap = new Map();
	for (let i = 0; i < midi.tracks.length; i++) {
		const track = midi.tracks[i];
		if (!track.notes.length) continue;
		const trackName = track.name?.trim();
		const name = (trackName || fallbackChannelName || `track-${i}`).toLowerCase();
		const events: ChannelEvent[] = track.notes
			.map((n) => ({
				time: n.time,
				duration: n.duration,
				pitch: n.midi,
				noteName: n.name,
				velocity: n.velocity
			}))
			.sort((a, b) => a.time - b.time);
		channels.set(name, events);
	}

	const tempos = (midi.header.tempos ?? []).map((t) => ({ time: t.time, bpm: t.bpm }));
	const bpm = tempos[0]?.bpm ?? null;
	console.log(`[midi] ${label}: bpm=${bpm}, tempo events=${tempos.length}`, tempos);
	return { channels, bpm, tempos };
}

export function channelNameFromUrl(url: string): string {
	const file = url.split("/").pop() ?? url;
	const decoded = decodeURIComponent(file.split("?")[0]);
	const stem = decoded.replace(/\.mid$/i, "");
	return stem.split(/\s+/)[0].toLowerCase();
}
