import { loadMidi, channelNameFromUrl } from "./parser";
import type { ChannelMap, ChannelEvent, Trigger } from "./types";

class Lightshow {
	bpm = $state(0);
	midiBpm = $state<number | null>(null);
	channels = $state<ChannelMap>(new Map());
	lastTrigger = $state<Trigger | null>(null);
	pulseCount = $state<Record<string, number>>({});
	offset = $state(0.025);
	channelOffsets = $state<Record<string, number>>({});
	timeScale = $state(1);
	muted = $state<Record<string, boolean>>({});
	soloed = $state<Record<string, boolean>>({});

	#cursors = new Map<string, number>();
	#rafId: number | null = null;
	#getAudibleTime: (() => number) | null = null;
	#listeners = new Set<(t: Trigger) => void>();

	subscribe(fn: (t: Trigger) => void) {
		this.#listeners.add(fn);
		return () => this.#listeners.delete(fn);
	}

	async load(
		midi:
			| string
			| File
			| { url: string | File; name?: string }
			| Array<string | File | { url: string | File; name?: string }>
			| null,
		bpm: number | null
	) {
		this.stop();
		this.bpm = bpm ?? 0;
		this.midiBpm = null;

		const merged: ChannelMap = new Map();
		if (midi) {
			const entries = Array.isArray(midi) ? midi : [midi];
			console.log("[lightshow] load: entries=", entries.length, entries);
			for (const entry of entries) {
				let source: string | File;
				let explicitName: string | undefined;
				if (typeof entry === "string" || entry instanceof File) {
					source = entry;
					explicitName = undefined;
				} else {
					source = entry.url;
					explicitName = entry.name;
				}
				const fallback =
					explicitName ??
					(typeof source === "string"
						? channelNameFromUrl(source)
						: source.name.replace(/\.midi?$/i, "").replace(/\s+/g, "-").toLowerCase());

				let parsed: ChannelMap;
				let parsedBpm: number | null;
				try {
					const result = await loadMidi(source, fallback);
					parsed = result.channels;
					parsedBpm = result.bpm;
				} catch (e) {
					console.error("[lightshow] failed to load entry", fallback, source, e);
					continue;
				}
				const effectiveMidiBpm = parsedBpm ?? 120;
				if (this.midiBpm === null) this.midiBpm = effectiveMidiBpm;
				const scale = bpm && Math.abs(effectiveMidiBpm - bpm) > 0.001 ? effectiveMidiBpm / bpm : 1;

				let entries2: Array<[string, ChannelEvent[]]>;
				if (explicitName) {
					const all: ChannelEvent[] = [];
					for (const evs of parsed.values()) all.push(...evs);
					all.sort((a, b) => a.time - b.time);
					entries2 = [[explicitName, all]];
				} else {
					entries2 = [...parsed];
				}

				for (const [name, events] of entries2) {
					const scaled = scale === 1
						? events
						: events.map((e) => ({ ...e, time: e.time * scale, duration: e.duration * scale }));
					if (merged.has(name)) {
						merged.set(
							name,
							[...merged.get(name)!, ...scaled].sort((a, b) => a.time - b.time)
						);
					} else {
						merged.set(name, scaled);
					}
				}
			}
		}
		this.channels = merged;
		console.log("[lightshow] load complete: channels=", merged.size, [...merged.keys()]);

		this.pulseCount = {};
		for (const name of this.channels.keys()) {
			this.pulseCount[name] = 0;
		}
	}

	start(getAudibleTime: () => number) {
		this.stop();
		this.#getAudibleTime = getAudibleTime;
		this.#cursors.clear();
		for (const name of this.channels.keys()) {
			this.#cursors.set(name, 0);
		}
		this.seek(getAudibleTime());
		this.#tick();
	}

	stop() {
		if (this.#rafId !== null) cancelAnimationFrame(this.#rafId);
		this.#rafId = null;
		this.#getAudibleTime = null;
	}

	seek(audibleTime: number) {
		for (const [name, events] of this.channels) {
			const adjusted = audibleTime - (this.channelOffsets[name] ?? 0);
			let i = 0;
			while (i < events.length && events[i].time <= adjusted) i++;
			this.#cursors.set(name, i);
		}
	}

	setChannelOffset(name: string, seconds: number) {
		this.channelOffsets = { ...this.channelOffsets, [name]: seconds };
		if (this.#getAudibleTime) this.seek(this.#getAudibleTime());
	}

	nextEvent(name: string): ChannelEvent | null {
		const events = this.channels.get(name);
		if (!events) return null;
		const cursor = this.#cursors.get(name) ?? 0;
		return events[cursor] ?? null;
	}

	#tick = () => {
		if (!this.#getAudibleTime) return;
		const baseT = (this.#getAudibleTime() + this.offset) / this.timeScale;

		for (const [name, events] of this.channels) {
			const t = baseT - (this.channelOffsets[name] ?? 0);
			let cursor = this.#cursors.get(name) ?? 0;
			while (cursor < events.length && events[cursor].time <= t) {
				this.#fire(name, events[cursor]);
				cursor++;
			}
			this.#cursors.set(name, cursor);
		}

		this.#rafId = requestAnimationFrame(this.#tick);
	};

	#fire(channel: string, event: ChannelEvent) {
		if (!this.isAudible(channel)) return;
		const trigger = { channel, event, firedAt: performance.now() };
		this.lastTrigger = trigger;
		this.pulseCount = {
			...this.pulseCount,
			[channel]: (this.pulseCount[channel] ?? 0) + 1
		};
		for (const fn of this.#listeners) fn(trigger);
	}

	isAudible(channel: string): boolean {
		if (this.muted[channel]) return false;
		const anySoloed = Object.values(this.soloed).some(Boolean);
		if (anySoloed && !this.soloed[channel]) return false;
		return true;
	}

	toggleMute(channel: string) {
		this.muted = { ...this.muted, [channel]: !this.muted[channel] };
	}

	toggleSolo(channel: string) {
		this.soloed = { ...this.soloed, [channel]: !this.soloed[channel] };
	}
}

export const lightshow = new Lightshow();

if (typeof window !== "undefined") {
	(window as unknown as { lightshow: Lightshow }).lightshow = lightshow;
}
