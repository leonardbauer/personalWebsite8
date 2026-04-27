import { lightshow } from "$lib/lightshow/store.svelte";

type MidiEntry = string | File | { url: string | File; name?: string };

type Track = {
	src: string | File;
	bpm?: number | null;
	midi?: MidiEntry | MidiEntry[] | null;
	midiOffsets?: Record<string, number>;
};

class Player {
	current = $state<string | null>(null);
	loading = $state<string | null>(null);
	position = $state(0);
	duration = $state(0);
	currentBuffer = $state<AudioBuffer | null>(null);

	#ctx: AudioContext | null = null;
	#tracks = new Map<string, Track>();
	#buffers = new Map<string, AudioBuffer>();
	#bufferLoads = new Map<string, Promise<AudioBuffer>>();
	#pausedAt = new Map<string, number>();
	#preparing = new Map<string, Promise<void>>();

	#srcKey(src: string | File): string {
		return typeof src === "string" ? src : `file:${src.name}:${src.size}:${src.lastModified}`;
	}

	#source: AudioBufferSourceNode | null = null;
	#gain: GainNode | null = null;
	#fadeSeconds = 0.01;
	#startCtxTime = 0;
	#startOffset = 0;
	#playing = false;
	#positionRafId: number | null = null;
	#toggleVersion = 0;
	#lastId: string | null = null;

	register(id: string, track: Track) {
		this.#tracks.set(id, track);
	}

	#ensureCtx() {
		if (this.#ctx || typeof window === "undefined") return;
		this.#ctx = new AudioContext();
	}

	async #loadBuffer(src: string | File): Promise<AudioBuffer> {
		const key = this.#srcKey(src);
		const cached = this.#buffers.get(key);
		if (cached) return cached;

		const pending = this.#bufferLoads.get(key);
		if (pending) return pending;

		const promise = (async () => {
			let arr: ArrayBuffer;
			if (typeof src === "string") {
				const res = await fetch(src);
				if (!res.ok) throw new Error(`audio fetch failed: ${res.status}`);
				arr = await res.arrayBuffer();
			} else {
				arr = await src.arrayBuffer();
			}
			console.log("[player] decoding audio buffer", { key, bytes: arr.byteLength });
			const buf = await this.#ctx!.decodeAudioData(arr);
			this.#buffers.set(key, buf);
			return buf;
		})();

		this.#bufferLoads.set(key, promise);
		try {
			return await promise;
		} finally {
			this.#bufferLoads.delete(key);
		}
	}

	#audibleTime() {
		if (!this.#ctx || !this.#playing) return this.#startOffset;
		const elapsed = this.#ctx.currentTime - this.#startCtxTime;
		return Math.max(0, this.#startOffset + elapsed - this.#ctx.outputLatency);
	}

	#headTime() {
		if (!this.#ctx || !this.#playing) return this.#startOffset;
		return this.#startOffset + (this.#ctx.currentTime - this.#startCtxTime);
	}

	#tickPosition = () => {
		this.position = this.#headTime();
		this.#positionRafId = requestAnimationFrame(this.#tickPosition);
	};

	#stopSource() {
		const src = this.#source;
		const gain = this.#gain;
		this.#source = null;
		this.#gain = null;
		this.#playing = false;
		if (this.#positionRafId !== null) {
			cancelAnimationFrame(this.#positionRafId);
			this.#positionRafId = null;
		}
		if (!src) return;
		src.onended = null;
		if (gain && this.#ctx) {
			const now = this.#ctx.currentTime;
			const stopAt = now + this.#fadeSeconds;
			try {
				gain.gain.cancelScheduledValues(now);
				gain.gain.setValueAtTime(gain.gain.value, now);
				gain.gain.linearRampToValueAtTime(0, stopAt);
			} catch {
				// gain already disposed
			}
			try {
				src.stop(stopAt);
			} catch {
				// already stopped
			}
			setTimeout(() => {
				try { src.disconnect(); } catch { /* already gone */ }
				try { gain.disconnect(); } catch { /* already gone */ }
			}, this.#fadeSeconds * 1000 + 50);
		} else {
			try { src.stop(); } catch { /* already stopped */ }
			try { src.disconnect(); } catch { /* already gone */ }
		}
	}

	#startSource(buffer: AudioBuffer, offset: number) {
		if (!this.#ctx) return;
		if (this.#source) this.#stopSource();
		const src = this.#ctx.createBufferSource();
		src.buffer = buffer;
		const gain = this.#ctx.createGain();
		const now = this.#ctx.currentTime;
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(1, now + this.#fadeSeconds);
		src.connect(gain);
		gain.connect(this.#ctx.destination);
		this.#gain = gain;
		src.onended = () => {
			if (!this.#playing) return;
			this.#playing = false;
			const id = this.current;
			this.current = null;
			this.position = 0;
			if (id) this.#pausedAt.delete(id);
			lightshow.stop();
		};
		this.#startCtxTime = this.#ctx.currentTime;
		this.#startOffset = offset;
		src.start(0, offset);
		this.#source = src;
		this.#playing = true;
		this.#tickPosition();
	}

	async toggle(id: string) {
		this.#ensureCtx();
		if (!this.#ctx) return;

		this.#lastId = id;
		const myVersion = ++this.#toggleVersion;

		if (this.#ctx.state === "suspended") {
			await this.#ctx.resume();
			if (this.#toggleVersion !== myVersion) return;
		}

		if (this.current === id) {
			this.#pausedAt.set(id, this.#headTime());
			this.#stopSource();
			lightshow.stop();
			this.current = null;
			return;
		}

		if (this.current) {
			this.#pausedAt.set(this.current, this.#headTime());
		}
		this.#stopSource();
		lightshow.stop();

		const track = this.#tracks.get(id);
		if (!track) return;

		this.loading = id;
		try {
			const buffer = await this.#loadBuffer(track.src);
			if (this.#toggleVersion !== myVersion) return;
			this.duration = buffer.duration;
			this.currentBuffer = buffer;

			await lightshow.load(track.midi ?? null, track.bpm ?? null);
			if (this.#toggleVersion !== myVersion) return;
			lightshow.channelOffsets = track.midiOffsets ?? {};

			const offset = this.#pausedAt.get(id) ?? 0;
			this.current = id;
			this.position = offset;
			this.#startSource(buffer, offset);
			lightshow.start(() => this.#audibleTime());
		} finally {
			if (this.#toggleVersion === myVersion) this.loading = null;
		}
	}

	togglePlayPause() {
		const id = this.current ?? this.#lastId ?? this.#tracks.keys().next().value;
		if (!id) return;
		void this.toggle(id);
	}

	seek(time: number) {
		if (!this.#ctx || !this.currentBuffer) return;
		const buffer = this.currentBuffer;
		const clamped = Math.max(0, Math.min(time, buffer.duration));

		if (this.#playing) {
			this.#stopSource();
			this.position = clamped;
			this.#startSource(buffer, clamped);
		} else {
			this.#startOffset = clamped;
			this.position = clamped;
			const id = this.current ?? this.#lastId;
			if (id) this.#pausedAt.set(id, clamped);
		}

		lightshow.seek(this.#audibleTime());
	}

	async prepare(id: string) {
		const existing = this.#preparing.get(id);
		if (existing) return existing;

		const promise = this.#prepareInternal(id);
		this.#preparing.set(id, promise);
		try {
			await promise;
		} finally {
			this.#preparing.delete(id);
		}
	}

	async #prepareInternal(id: string) {
		this.#ensureCtx();
		if (!this.#ctx) return;

		const track = this.#tracks.get(id);
		if (!track) {
			console.warn("[player] prepare: track not registered", id);
			return;
		}

		try {
			const buffer = await this.#loadBuffer(track.src);
			this.duration = buffer.duration;
			this.currentBuffer = buffer;
			await lightshow.load(track.midi ?? null, track.bpm ?? null);
			lightshow.channelOffsets = track.midiOffsets ?? {};
			this.#lastId = id;
			console.log("[player] prepare complete", id);
		} catch (e) {
			console.error("[player] prepare failed", id, e);
		}
	}
}

export const player = new Player();

if (typeof window !== "undefined") {
	(window as unknown as { player: Player }).player = player;
}
