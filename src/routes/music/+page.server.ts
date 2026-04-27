import { promises as fs } from "node:fs";
import path from "node:path";

export async function load() {
	const showsDir = path.resolve("static/shows");
	const shows: Array<{ name: string; src: string }> = [];
	try {
		const entries = await fs.readdir(showsDir, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const showJson = path.join(showsDir, entry.name, "show.json");
			try {
				await fs.access(showJson);
				shows.push({ name: entry.name, src: `/shows/${entry.name}/show.json` });
			} catch {
				// no show.json in this folder, skip
			}
		}
	} catch {
		// shows folder doesn't exist
	}
	return { title: "Music", shows };
}
