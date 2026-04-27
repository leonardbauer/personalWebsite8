import { json } from "@sveltejs/kit";
import { listKeys, fetchKeyText } from "$lib/server/r2";

type ShowMeta = {
	name: string;
	title: string;
	artist: string | null;
	bpm: number;
	channelCount: number;
	addedAt: string | null;
	tags: string[];
};

type ShowJson = {
	showName?: string;
	title?: string;
	artist?: string;
	bpm?: number;
	addedAt?: string;
	tags?: string[];
	channels?: unknown[];
};

export async function GET() {
	let keys: string[];
	try {
		keys = await listKeys("shows/");
	} catch (e) {
		console.error("[api/shows] list failed", e);
		return json({ shows: [] satisfies ShowMeta[] });
	}

	const showJsonKeys = keys.filter((k) => /^shows\/[^/]+\/show\.json$/.test(k));

	const shows: ShowMeta[] = [];
	for (const key of showJsonKeys) {
		const name = key.split("/")[1];
		try {
			const raw = await fetchKeyText(key);
			const data = JSON.parse(raw) as ShowJson;
			shows.push({
				name,
				title: data.title ?? data.showName ?? name,
				artist: data.artist ?? null,
				bpm: data.bpm ?? 0,
				channelCount: Array.isArray(data.channels) ? data.channels.length : 0,
				addedAt: data.addedAt ?? null,
				tags: data.tags ?? []
			});
		} catch (e) {
			console.warn(`[api/shows] skipping ${key}`, e);
		}
	}

	shows.sort((a, b) => {
		if (a.addedAt && b.addedAt) return b.addedAt.localeCompare(a.addedAt);
		return a.title.localeCompare(b.title);
	});

	return json({ shows });
}
