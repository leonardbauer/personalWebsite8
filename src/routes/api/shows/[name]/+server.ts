import { error, json } from "@sveltejs/kit";
import { presign, fetchKeyText } from "$lib/server/r2";

type ShowDef = {
	showName: string;
	bpm: number;
	audio: string;
	channels: Array<{ name: string; midi: string | null; [k: string]: unknown }>;
};

export async function GET({ params }) {
	const name = params.name;
	if (!name || /[/\\]/.test(name)) throw error(400, "invalid show name");

	let raw: string;
	try {
		raw = await fetchKeyText(`shows/${name}/show.json`);
	} catch (e) {
		console.error("[api/shows] fetch failed", name, e);
		throw error(404, "show not found");
	}

	const show = JSON.parse(raw) as ShowDef;
	const expires = 3600;
	const audioSigned = await presign(`shows/${name}/${show.audio}`, expires);
	const channels = await Promise.all(
		show.channels.map(async (c) => {
			if (!c.midi) return c;
			const midiSigned = await presign(`shows/${name}/midi/${c.midi}`, expires);
			return { ...c, midi: midiSigned };
		})
	);

	return json({ ...show, audio: audioSigned, channels });
}
