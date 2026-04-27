<script lang="ts">
	import { onMount } from "svelte";
	import { player } from "$lib/stores/player.svelte";
	import { lightshow } from "$lib/lightshow/store.svelte";
	import { loadMidi } from "$lib/lightshow/parser";
	import {
		putFile,
		getFile,
		deleteFile,
		listFileKeys,
		loadConfig,
		saveConfig,
		type StudioConfig
	} from "$lib/lightshow/persistence";
	import { keybinds } from "$lib/lightshow/keybinds.svelte";
	import { DEFAULT_ADSR, type ADSR } from "$lib/lightshow/envelope";
	import { evaluateLane, defaultLane, type AutomationLane } from "$lib/lightshow/automation";
	import FlashWash from "$lib/components/effects/FlashWash.svelte";
	import Strobe from "$lib/components/effects/Strobe.svelte";
	import ShaderBloom from "$lib/components/effects/ShaderBloom.svelte";
	import ADSRVisualizer from "$lib/components/effects/ADSRVisualizer.svelte";
	import Timeline, { type AutomationView } from "$lib/components/effects/Timeline.svelte";
	import JSZip from "jszip";
	import LightshowDebug from "$lib/components/effects/LightshowDebug.svelte";

	type EffectType = "flash" | "strobe" | "pulse" | "bloom";

	type AutomatableParam = "maxOpacity" | "strobeSubdivisions";

	type ChannelConfig = {
		fileName: string;
		name: string;
		color: string;
		noteColors: Record<string, string>;
		maxOpacity: number;
		adsr: ADSR;
		offset: number;
		effect: EffectType;
		strobeSubdivisions: number;
		automations: Partial<Record<AutomatableParam, AutomationLane>>;
		expanded: boolean;
	};

	const AUTOMATABLE_PARAMS: Array<{
		key: AutomatableParam;
		label: string;
		min: number;
		max: number;
		values?: number[];
		logScale?: boolean;
	}> = [
		{ key: "maxOpacity", label: "max opacity", min: 0, max: 1 },
		{
			key: "strobeSubdivisions",
			label: "strobe rate",
			min: 0.25,
			max: 16,
			values: [0.25, 0.5, 1, 2, 4, 8, 16],
			logScale: true
		}
	];

	const EFFECT_LIBRARY: Array<{ id: EffectType; label: string; description: string }> = [
		{ id: "flash", label: "Flash Wash", description: "Full-screen colored wash" },
		{ id: "strobe", label: "Strobe", description: "Quick bright pulse" },
		{ id: "pulse", label: "Pulse", description: "Scale + glow on element" },
		{ id: "bloom", label: "Bloom (GPU)", description: "WebGPU radial bloom shader" }
	];

	function makeDefaultName(filename: string): string {
		return filename.replace(/\.midi?$/i, "").replace(/\s+/g, "-").toLowerCase();
	}

	const PREVIEW_ID = "studio-preview";
	const PALETTE = ["#ff00aa", "#7df9ff", "#ffd400", "#a64dff", "#ff6b00", "#00ffaa", "#ffffff", "#ff4040"];
	const AUDIO_KEY = "audio";
	const MIDI_PREFIX = "midi-";

	let audioFile = $state<File | null>(null);
	let midiFiles = $state<File[]>([]);
	let bpm = $state(125);
	let channels = $state<ChannelConfig[]>([]);
	let restored = $state(false);
	let lastSaved = $state<number | null>(null);
	let parsing = $state(false);
	let parseError = $state<string | null>(null);
	let vw = $state(1200);
	let vh = $state(800);
	let selectedChannel = $state<string | null>(null);

	let selectedConfig = $derived(channels.find((c) => c.name === selectedChannel) ?? null);
	let selectedIndex = $derived(channels.findIndex((c) => c.name === selectedChannel));
	let availableNotes = $derived.by(() => {
		if (!selectedChannel) return [] as string[];
		const events = lightshow.channels.get(selectedChannel) ?? [];
		const set = new Set<string>();
		for (const e of events) set.add(e.noteName);
		return [...set].sort((a, b) => {
			const re = /^([A-G]#?)(-?\d+)$/;
			const ma = a.match(re);
			const mb = b.match(re);
			if (!ma || !mb) return a.localeCompare(b);
			const oa = parseInt(ma[2], 10);
			const ob = parseInt(mb[2], 10);
			return oa - ob || a.localeCompare(b);
		});
	});

	let audioInputEl: HTMLInputElement | undefined = $state();
	let midiInputEl: HTMLInputElement | undefined = $state();

	const LAYOUT_KEY = "lightshow-studio-layout";
	let filesW = $state(200);
	let libraryW = $state(240);
	let timelineH = $state(0.4);
	let debugW = $state(0);
	let previewW = $state(0);
	let previewMode = $state<"overlay" | "window">("overlay");

	type LayoutSnapshot = {
		filesW: number;
		libraryW: number;
		timelineH: number;
		debugW: number;
		previewW: number;
		previewMode: "overlay" | "window";
	};

	function loadLayout() {
		if (typeof localStorage === "undefined") return;
		try {
			const raw = localStorage.getItem(LAYOUT_KEY);
			if (!raw) return;
			const v = JSON.parse(raw) as Partial<LayoutSnapshot>;
			if (typeof v.filesW === "number") filesW = clampW(v.filesW);
			if (typeof v.libraryW === "number") libraryW = clampW(v.libraryW);
			if (typeof v.timelineH === "number") timelineH = clampH(v.timelineH);
			if (typeof v.debugW === "number") debugW = clampDebug(v.debugW);
			if (typeof v.previewW === "number") previewW = clampPreview(v.previewW);
			if (v.previewMode === "overlay" || v.previewMode === "window") previewMode = v.previewMode;
		} catch {
			// ignore
		}
	}
	function saveLayout() {
		if (typeof localStorage === "undefined") return;
		const snap: LayoutSnapshot = { filesW, libraryW, timelineH, debugW, previewW, previewMode };
		localStorage.setItem(LAYOUT_KEY, JSON.stringify(snap));
	}

	function clampPreview(v: number) {
		if (v < 60) return 0;
		return Math.min(800, v);
	}

	function togglePreview() {
		previewW = previewW > 0 ? 0 : 320;
		saveLayout();
	}

	function startPreviewResize(e: PointerEvent) {
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		const startX = e.clientX;
		const startW = previewW;
		const move = (ev: PointerEvent) => {
			previewW = clampPreview(startW + (startX - ev.clientX));
		};
		const up = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			saveLayout();
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
	}

	function clampDebug(v: number) {
		if (v < 30) return 0;
		return Math.min(600, v);
	}

	let timelinePx = $derived(Math.floor(vh * timelineH) + 6);

	function clampW(v: number) {
		return Math.max(120, Math.min(500, v));
	}
	function clampH(v: number) {
		return Math.max(0.15, Math.min(0.75, v));
	}

	function startColResize(target: "files" | "library", e: PointerEvent) {
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		const startX = e.clientX;
		const startW = target === "files" ? filesW : libraryW;
		const move = (ev: PointerEvent) => {
			const next = clampW(startW + (ev.clientX - startX));
			if (target === "files") filesW = next;
			else libraryW = next;
		};
		const up = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			saveLayout();
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
	}

	function startDebugResize(e: PointerEvent) {
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		const startX = e.clientX;
		const startW = debugW;
		const move = (ev: PointerEvent) => {
			const next = startW + (startX - ev.clientX);
			debugW = clampDebug(next);
		};
		const up = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			saveLayout();
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
	}

	function startTimelineResize(e: PointerEvent) {
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		const startY = e.clientY;
		const startH = timelineH;
		const winH = window.innerHeight;
		const move = (ev: PointerEvent) => {
			const deltaFrac = (startY - ev.clientY) / winH;
			timelineH = clampH(startH + deltaFrac);
		};
		const up = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			saveLayout();
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
	}

	$effect(() => {
		if (!midiFiles.length) {
			if (restored) channels = [];
			return;
		}
		const filesSnapshot = midiFiles;
		refreshChannels(filesSnapshot);
	});

	onMount(() => {
		loadLayout();
		const updateSize = () => {
			vw = window.innerWidth;
			vh = window.innerHeight;
		};
		updateSize();
		window.addEventListener("resize", updateSize);
		return () => window.removeEventListener("resize", updateSize);
	});

	function handleKeydown(event: KeyboardEvent) {
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
		window.addEventListener("keydown", handleKeydown, { capture: true, passive: false });
		return () => window.removeEventListener("keydown", handleKeydown, { capture: true });
	});

	onMount(() => {
		const off1 = keybinds.register({
			id: "studio.toggleSolo",
			description: "Solo selected channel",
			key: "s",
			handler: () => {
				if (selectedChannel) lightshow.toggleSolo(selectedChannel);
			}
		});
		const off2 = keybinds.register({
			id: "studio.toggleMute",
			description: "Mute selected channel",
			key: "0",
			handler: () => {
				if (selectedChannel) lightshow.toggleMute(selectedChannel);
			}
		});
		return () => {
			off1();
			off2();
		};
	});

	onMount(async () => {
		console.log("[studio] onMount restore start");
		const cfg = loadConfig();
		console.log("[studio] config from localStorage:", cfg);
		const keys = await listFileKeys();
		console.log("[studio] IDB file keys:", keys);

		if (cfg?.audioKey && keys.includes(cfg.audioKey)) {
			const f = await getFile(cfg.audioKey);
			console.log("[studio] restored audio:", f?.name, f?.size, "bytes");
			if (f) audioFile = f;
		} else {
			console.log("[studio] no audio to restore (cfg.audioKey:", cfg?.audioKey, ")");
		}

		if (cfg?.midiKeys?.length) {
			const restoredMidi: File[] = [];
			for (const key of cfg.midiKeys) {
				if (!keys.includes(key)) {
					console.log("[studio] missing midi key in IDB:", key);
					continue;
				}
				const f = await getFile(key);
				if (f) restoredMidi.push(f);
			}
			console.log("[studio] restored midi files:", restoredMidi.map((f) => f.name));
			if (restoredMidi.length) midiFiles = restoredMidi;
		}

		if (cfg) {
			bpm = cfg.bpm;
			if (cfg.channels?.length) {
				channels = cfg.channels.map((c) => {
					const cc = c as Partial<ChannelConfig> & { decay?: number };
					const adsr =
						cc.adsr ??
						(cc.decay
							? { attack: 0, decay: 0, sustain: 1, release: cc.decay / 1000 }
							: { ...DEFAULT_ADSR });
					const cExt = c as Partial<ChannelConfig>;
					return {
						fileName: c.fileName ?? "",
						name: c.name,
						color: c.color,
						noteColors: c.noteColors ?? {},
						maxOpacity: c.maxOpacity,
						adsr,
						offset: c.offset,
						effect: ((c as { effect?: EffectType }).effect ?? "flash") as EffectType,
						strobeSubdivisions:
							(c as { strobeSubdivisions?: number }).strobeSubdivisions ?? 4,
						automations: cExt.automations ?? {},
						expanded: cExt.expanded ?? false
					};
				});
				console.log("[studio] restored channels:", channels.length);
			}
		}

		restored = true;
		console.log("[studio] restored = true");

		await new Promise((r) => setTimeout(r, 50));
		console.log("[studio] post-tick state:", {
			audioFile: audioFile?.name,
			channels: channels.length,
			midiFiles: midiFiles.length
		});
		preparePreview();
	});

	$effect(() => {
		if (!restored) return;
		const f = audioFile;
		if (!f) return;
		console.log("[studio] saving audio to IDB:", f.name);
		void putFile(AUDIO_KEY, f).then(() => console.log("[studio] audio saved"));
	});

	$effect(() => {
		if (!restored) return;
		const files = midiFiles;
		(async () => {
			console.log("[studio] saving midi files to IDB:", files.map((f) => f.name));
			const existing = (await listFileKeys()).filter((k) => k.startsWith(MIDI_PREFIX));
			for (const k of existing) await deleteFile(k);
			for (let i = 0; i < files.length; i++) {
				await putFile(MIDI_PREFIX + i, files[i]);
			}
			console.log("[studio] midi files saved");
		})();
	});

	function preparePreview() {
		const r = restored;
		const af = audioFile;
		const mf = midiFiles;
		const ch = channels;
		const b = bpm;
		const cur = player.current;

		if (!r || !af || mf.length === 0) return;
		if (ch.length !== mf.length) return;
		if (cur === PREVIEW_ID) return;

		const midiOffsets: Record<string, number> = {};
		for (const c of ch) if (c.offset !== 0) midiOffsets[c.name] = c.offset;

		const midiEntries = mf.map((f, i) => ({
			url: f,
			name: ch[i]?.name ?? makeDefaultName(f.name)
		}));

		console.log("[studio] prepare preview", { src: af.name, files: mf.length, bpm: b });

		player.register(PREVIEW_ID, {
			src: af,
			bpm: b,
			midi: midiEntries,
			midiOffsets
		});
		void player.prepare(PREVIEW_ID);
	}

	let prepareTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		const r = restored;
		const af = audioFile;
		const mf = midiFiles;
		const ch = channels;
		const b = bpm;
		const cur = player.current;
		void r;
		void af;
		void mf;
		void ch;
		void b;
		void cur;

		if (prepareTimer) clearTimeout(prepareTimer);
		prepareTimer = setTimeout(() => preparePreview(), 200);
	});

	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		if (!restored) return;
		const snapshot: StudioConfig = {
			bpm,
			channels: channels.map((c) => ({ ...c })),
			audioKey: audioFile ? AUDIO_KEY : null,
			midiKeys: midiFiles.map((_, i) => MIDI_PREFIX + i)
		};
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			saveConfig(snapshot);
			lastSaved = Date.now();
		}, 250);
	});

	async function refreshChannels(files: File[]) {
		parsing = true;
		parseError = null;
		const errors: string[] = [];

		for (let i = 0; i < files.length; i++) {
			try {
				const { channels: ch } = await loadMidi(files[i], makeDefaultName(files[i].name));
				if (ch.size === 0) errors.push(`${files[i].name}: no tracks with notes`);
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e);
				errors.push(`${files[i].name}: ${msg}`);
				console.error("parse failed", files[i].name, e);
			}
		}

		parsing = false;
		if (errors.length) parseError = errors.join("\n");

		const existing = new Map(channels.map((c) => [c.fileName, c]));
		channels = files.map(
			(f, i) =>
				existing.get(f.name) ?? {
					fileName: f.name,
					name: makeDefaultName(f.name),
					color: PALETTE[i % PALETTE.length],
					noteColors: {},
					maxOpacity: 0.6,
					adsr: { ...DEFAULT_ADSR },
					offset: 0,
					effect: "flash" as EffectType,
					strobeSubdivisions: 4,
					automations: {},
					expanded: false
				}
		);
	}

	let isPlaying = $derived(player.current === PREVIEW_ID);

	let automationViews = $derived.by(() => {
		const views: AutomationView[] = [];
		for (const ch of channels) {
			for (const p of AUTOMATABLE_PARAMS) {
				const lane = ch.automations[p.key];
				if (lane && lane.enabled) {
					views.push({
						channelName: ch.name,
						param: p.label,
						min: p.min,
						max: p.max,
						lane,
						color: ch.color,
						values: p.values,
						logScale: p.logScale
					});
				}
			}
		}
		return views;
	});

	function findAutomation(channelName: string, paramLabel: string) {
		const idx = channels.findIndex((c) => c.name === channelName);
		if (idx < 0) return null;
		const param = AUTOMATABLE_PARAMS.find((p) => p.label === paramLabel);
		if (!param) return null;
		return { idx, param };
	}

	function handleAddBreakpoint(channelName: string, paramLabel: string, time: number, value: number) {
		const found = findAutomation(channelName, paramLabel);
		if (!found) return;
		const lane = channels[found.idx].automations[found.param.key];
		if (!lane) return;
		const v = snapEnum(found.param, value);
		const bps = [...lane.breakpoints, { time, value: v, curve: "linear" as const }].sort(
			(a, b) => a.time - b.time
		);
		channels[found.idx].automations = {
			...channels[found.idx].automations,
			[found.param.key]: { ...lane, breakpoints: bps }
		};
	}

	function snapEnum(param: typeof AUTOMATABLE_PARAMS[number], value: number): number {
		const clamped = Math.max(param.min, Math.min(param.max, value));
		if (!param.values) return clamped;
		let nearest = param.values[0];
		let best = Math.abs(clamped - nearest);
		for (const c of param.values) {
			const d = Math.abs(clamped - c);
			if (d < best) {
				best = d;
				nearest = c;
			}
		}
		return nearest;
	}

	function handleMoveBreakpoint(
		channelName: string,
		paramLabel: string,
		bpIdx: number,
		time: number,
		value: number
	) {
		const found = findAutomation(channelName, paramLabel);
		if (!found) return;
		const lane = channels[found.idx].automations[found.param.key];
		if (!lane || bpIdx < 0 || bpIdx >= lane.breakpoints.length) return;
		const v = snapEnum(found.param, value);
		const bps = [...lane.breakpoints];
		bps[bpIdx] = { ...bps[bpIdx], time: Math.max(0, time), value: v };
		bps.sort((a, b) => a.time - b.time);
		channels[found.idx].automations = {
			...channels[found.idx].automations,
			[found.param.key]: { ...lane, breakpoints: bps }
		};
	}

	function handleRemoveBreakpoint(channelName: string, paramLabel: string, bpIdx: number) {
		const found = findAutomation(channelName, paramLabel);
		if (!found) return;
		const lane = channels[found.idx].automations[found.param.key];
		if (!lane || lane.breakpoints.length <= 1) return;
		const bps = lane.breakpoints.filter((_, i) => i !== bpIdx);
		channels[found.idx].automations = {
			...channels[found.idx].automations,
			[found.param.key]: { ...lane, breakpoints: bps }
		};
	}

	function toggleAutomation(channelIdx: number, paramKey: AutomatableParam) {
		const ch = channels[channelIdx];
		if (ch.automations[paramKey]) {
			const next = { ...ch.automations };
			delete next[paramKey];
			channels[channelIdx].automations = next;
		} else {
			const param = AUTOMATABLE_PARAMS.find((p) => p.key === paramKey);
			const currentValue = ch[paramKey] as number;
			const lane = defaultLane(currentValue, player.duration || 60);
			if (param?.values) {
				lane.breakpoints = lane.breakpoints.map((bp) => ({
					...bp,
					value: snapEnum(param, bp.value),
					curve: "linear" as const
				}));
			}
			channels[channelIdx].automations = { ...ch.automations, [paramKey]: lane };
		}
	}

	async function play() {
		if (!audioFile) return;
		const midiOffsets: Record<string, number> = {};
		for (const c of channels) if (c.offset !== 0) midiOffsets[c.name] = c.offset;

		const midiEntries = midiFiles.map((f, i) => ({
			url: f,
			name: channels[i]?.name ?? makeDefaultName(f.name)
		}));

		player.register(PREVIEW_ID, {
			src: audioFile,
			bpm,
			midi: midiEntries,
			midiOffsets
		});
		await player.toggle(PREVIEW_ID);
	}

	function exportConfig() {
		const config = buildShowConfig();
		const json = JSON.stringify(config, null, 2);
		navigator.clipboard.writeText(json);
		console.log(json);
		alert("show.json copied to clipboard");
	}

	function buildShowConfig() {
		const showName = audioFile?.name?.replace(/\.[^.]+$/, "") ?? "show";
		return {
			showName,
			bpm,
			audio: audioFile?.name ?? null,
			channels: channels.map((c, i) => ({
				name: c.name,
				midi: midiFiles[i]?.name ?? null,
				color: c.color,
				noteColors: c.noteColors,
				maxOpacity: c.maxOpacity,
				adsr: c.adsr,
				offset: c.offset,
				effect: c.effect,
				strobeSubdivisions: c.strobeSubdivisions,
				automations: c.automations
			}))
		};
	}

	async function exportShowZip() {
		if (!audioFile) {
			alert("Add an audio file first");
			return;
		}
		const zip = new JSZip();
		const showName = audioFile.name.replace(/\.[^.]+$/, "");
		const folder = zip.folder(showName);
		if (!folder) return;

		folder.file(audioFile.name, audioFile);
		const midiFolder = folder.folder("midi");
		if (midiFolder) {
			for (const m of midiFiles) midiFolder.file(m.name, m);
		}

		const showJson = buildShowConfig();
		folder.file("show.json", JSON.stringify(showJson, null, 2));

		const readme = `# ${showName} lightshow

Drop this folder into \`static/shows/\` of your SvelteKit project so the assets
serve at \`/shows/${showName}/...\`. Then on your /music page, render:

\`\`\`svelte
<LightShow src="/shows/${showName}/show.json" />
\`\`\`

The \`<LightShow>\` component is in \`src/lib/components/effects/LightShow.svelte\`.
`;
		folder.file("README.md", readme);

		const blob = await zip.generateAsync({ type: "blob" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${showName}.zip`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 1500);
	}

	function fmt(t: number) {
		const m = Math.floor(t / 60);
		const s = (t % 60).toFixed(2);
		return `${m}:${s.padStart(5, "0")}`;
	}

	async function clearProject() {
		if (!confirm("Clear current project? Files and config will be deleted.")) return;

		if (player.current === PREVIEW_ID) {
			await player.toggle(PREVIEW_ID);
		}

		if (saveTimer) {
			clearTimeout(saveTimer);
			saveTimer = null;
		}

		const keys = await listFileKeys();
		for (const k of keys) await deleteFile(k);
		localStorage.removeItem("lightshow-studio-config");

		audioFile = null;
		midiFiles = [];
		channels = [];
		bpm = 125;
		selectedChannel = null;
		lastSaved = null;

		await lightshow.load(null, null);

		if (audioInputEl) audioInputEl.value = "";
		if (midiInputEl) midiInputEl.value = "";

		console.log("[studio] project cleared");
	}
</script>

<svelte:head>
	<title>Lightshow Studio</title>
</svelte:head>

<div class="studio">
	<header>
		<h1>Lightshow Studio</h1>
		<span class="position-display">
			{fmt(player.position)} <span class="dim">/ {fmt(player.duration)}</span>
		</span>
		<label class="bpm-inline">
			<input type="number" bind:value={bpm} min="20" max="300" step="0.01" />
			<span class="dim">bpm</span>
		</label>
		<div class="header-actions">
			<button onclick={play} disabled={!audioFile || !midiFiles.length || player.loading === PREVIEW_ID}>
				{#if player.loading === PREVIEW_ID}loading…{:else if isPlaying}pause{:else}play{/if}
			</button>
			<button onclick={exportShowZip} disabled={!channels.length || !audioFile}>export zip</button>
			<button onclick={exportConfig} disabled={!channels.length}>copy json</button>
			<button onclick={clearProject} class="danger">clear</button>
		</div>
		{#if lastSaved}<span class="saved-tag">auto-saved</span>{/if}
		<button
			type="button"
			class="preview-toggle"
			class:active={previewW > 0}
			onclick={togglePreview}
			title="toggle preview drawer"
			aria-label="toggle preview"
		>
			<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
				<rect x="2" y="4" width="13" height="16" rx="1" fill="none" stroke="currentColor" stroke-width="2" />
				<rect x="17" y="4" width="5" height="16" rx="1" fill="currentColor" />
				<path d="M11 8 L8 12 L11 16" stroke="currentColor" stroke-width="1.5" fill="none" />
			</svg>
		</button>
	</header>

	<div
		class="main-grid"
		style="grid-template-columns: {filesW}px 2px {libraryW}px 2px 1fr {previewW > 0 ? `2px ${previewW}px` : ''};"
	>
		<aside class="files-col">
			<h3>Files</h3>

			<label class="hidden-file-label">
				<input
					bind:this={audioInputEl}
					type="file"
					accept="audio/*"
					onchange={(e) => (audioFile = (e.currentTarget as HTMLInputElement).files?.[0] ?? null)}
				/>
				<span class="add-btn">+ audio</span>
			</label>

			<label class="hidden-file-label">
				<input
					bind:this={midiInputEl}
					type="file"
					accept=".mid,.midi"
					multiple
					onchange={(e) =>
						(midiFiles = [...((e.currentTarget as HTMLInputElement).files ?? [])])}
				/>
				<span class="add-btn">+ midi</span>
			</label>

			<div class="file-list">
				{#if audioFile}
					<div class="file-row audio-row">
						<span class="ic">♪</span>
						<span class="fname" title={audioFile.name}>{audioFile.name}</span>
					</div>
				{/if}
				{#each channels as ch, i (i)}
					<button
						type="button"
						class="file-row"
						class:selected={selectedChannel === ch.name}
						onclick={() => (selectedChannel = ch.name)}
					>
						<span class="swatch" style="background: {ch.color};"></span>
						<span class="fname" title={ch.fileName}>{ch.name}</span>
					</button>
				{/each}
			</div>

		</aside>

		<div
			class="splitter-v"
			role="separator"
			aria-orientation="vertical"
			tabindex="0"
			onpointerdown={(e) => startColResize("files", e)}
		></div>

		<aside class="library-col">
			<h3>Light Library</h3>
			<div class="effect-cards">
				{#each EFFECT_LIBRARY as eff (eff.id)}
					<button
						type="button"
						class="effect-card"
						class:active={selectedConfig?.effect === eff.id}
						disabled={!selectedConfig}
						onclick={() => {
							if (selectedIndex < 0) return;
							channels[selectedIndex].effect = eff.id;
						}}
					>
						<strong>{eff.label}</strong>
						<span>{eff.description}</span>
					</button>
				{/each}
			</div>
			{#if !selectedConfig}
				<p class="empty-hint">Select a channel from the timeline first.</p>
			{/if}
		</aside>

		<div
			class="splitter-v"
			role="separator"
			aria-orientation="vertical"
			tabindex="0"
			onpointerdown={(e) => startColResize("library", e)}
		></div>

		<main class="settings-col">
			{#if midiFiles.length && parsing}
				<div class="status-section">Parsing {midiFiles.length} MIDI files…</div>
			{/if}

			{#if parseError}
				<div class="status-section error">
					<strong>Parse errors:</strong>
					<pre>{parseError}</pre>
				</div>
			{/if}

			{#if selectedConfig}
				<section class="editor">
					<h2>{selectedConfig.name}</h2>
				<div class="editor-grid">
					<label>
						<span class="lbl">channel name</span>
						<input
							type="text"
							value={selectedConfig.name}
							oninput={(e) => {
								if (selectedIndex < 0) return;
								const newName = (e.currentTarget as HTMLInputElement).value;
								channels[selectedIndex].name = newName;
								selectedChannel = newName;
							}}
						/>
					</label>

					<label>
						<span class="lbl">default color</span>
						<input
							type="color"
							value={selectedConfig.color}
							oninput={(e) => {
								if (selectedIndex < 0) return;
								channels[selectedIndex].color = (e.currentTarget as HTMLInputElement).value;
							}}
						/>
						<input
							type="text"
							value={selectedConfig.color}
							oninput={(e) => {
								if (selectedIndex < 0) return;
								channels[selectedIndex].color = (e.currentTarget as HTMLInputElement).value;
							}}
							class="hex-input"
						/>
					</label>

					<label>
						<span class="lbl">max opacity</span>
						<input
							type="range"
							min="0"
							max="1"
							step="0.05"
							value={selectedConfig.maxOpacity}
							oninput={(e) => {
								if (selectedIndex < 0) return;
								channels[selectedIndex].maxOpacity = parseFloat((e.currentTarget as HTMLInputElement).value);
							}}
						/>
						<span class="num">{selectedConfig.maxOpacity.toFixed(2)}</span>
					</label>

					<div class="adsr-block">
						<div class="adsr-header">
							<span class="lbl">envelope (s)</span>
						</div>
						<ADSRVisualizer
							channel={selectedConfig.name}
							adsr={selectedConfig.adsr}
							color={selectedConfig.color}
						/>
						<div class="adsr-sliders">
							{#each [
								{ key: "attack", label: "A", max: 2, step: 0.01 },
								{ key: "decay", label: "D", max: 2, step: 0.01 },
								{ key: "sustain", label: "S", max: 1, step: 0.01 },
								{ key: "release", label: "R", max: 4, step: 0.01 }
							] as cfg (cfg.key)}
								<label class="adsr-slider">
									<span>{cfg.label}</span>
									<input
										type="range"
										min="0"
										max={cfg.max}
										step={cfg.step}
										value={selectedConfig.adsr[cfg.key as keyof ADSR]}
										oninput={(e) => {
											if (selectedIndex < 0) return;
											const v = parseFloat((e.currentTarget as HTMLInputElement).value);
											channels[selectedIndex].adsr = {
												...channels[selectedIndex].adsr,
												[cfg.key]: v
											};
										}}
									/>
									<span class="num">{selectedConfig.adsr[cfg.key as keyof ADSR].toFixed(2)}</span>
								</label>
							{/each}
						</div>
					</div>

					<div class="auto-section">
						<div class="lbl">automation</div>
						<div class="auto-toggles">
							{#each AUTOMATABLE_PARAMS as p (p.key)}
								<button
									type="button"
									class="auto-toggle"
									class:active={!!selectedConfig.automations[p.key]}
									onclick={() => toggleAutomation(selectedIndex, p.key)}
									disabled={selectedIndex < 0}
								>
									{selectedConfig.automations[p.key] ? "✓" : "+"} {p.label}
								</button>
							{/each}
						</div>
					</div>

					{#if selectedConfig.effect === "strobe"}
						<label>
							<span class="lbl">strobe rate</span>
							<select
								value={selectedConfig.strobeSubdivisions}
								onchange={(e) => {
									if (selectedIndex < 0) return;
									channels[selectedIndex].strobeSubdivisions = parseFloat(
										(e.currentTarget as HTMLSelectElement).value
									);
								}}
							>
								<option value={0.25}>1/1 (whole)</option>
								<option value={0.5}>1/2</option>
								<option value={1}>1/4</option>
								<option value={2}>1/8</option>
								<option value={4}>1/16</option>
								<option value={8}>1/32</option>
								<option value={16}>1/64</option>
							</select>
							<span class="num">
								{(((bpm || 120) / 60) * selectedConfig.strobeSubdivisions).toFixed(1)} Hz
							</span>
						</label>
					{/if}

					<label>
						<span class="lbl">offset (s)</span>
						<input
							type="number"
							step="0.01"
							value={selectedConfig.offset}
							oninput={(e) => {
								if (selectedIndex < 0) return;
								channels[selectedIndex].offset = parseFloat((e.currentTarget as HTMLInputElement).value) || 0;
							}}
						/>
					</label>
				</div>

				{#if availableNotes.length}
					<h3>Per-note colors ({availableNotes.length} unique)</h3>
					<div class="note-grid">
						{#each availableNotes as nn (nn)}
							<div class="note-row">
								<span class="note-name">{nn}</span>
								<input
									type="color"
									value={selectedConfig.noteColors[nn] ?? selectedConfig.color}
									oninput={(e) => {
										if (selectedIndex < 0) return;
										channels[selectedIndex].noteColors = {
											...channels[selectedIndex].noteColors,
											[nn]: (e.currentTarget as HTMLInputElement).value
										};
									}}
								/>
								{#if selectedConfig.noteColors[nn]}
									<button
										type="button"
										class="clear-btn"
										onclick={() => {
											if (selectedIndex < 0) return;
											const next = { ...channels[selectedIndex].noteColors };
											delete next[nn];
											channels[selectedIndex].noteColors = next;
										}}
										title="reset to default color"
									>
										×
									</button>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="empty-hint">
						Play once so the channel parses, then unique notes will appear here for per-note coloring.
					</p>
				{/if}
			</section>
			{:else}
				<div class="channel-hint">
					{#if !audioFile && !midiFiles.length}
						Add an audio file and MIDI clips to get started.
					{:else if !channels.length}
						Add MIDI files to populate the channel lanes.
					{:else}
						Click a channel lane in the timeline below to edit it.
					{/if}
				</div>
			{/if}
		</main>

		{#if previewW > 0}
			<div
				class="splitter-v"
				role="separator"
				aria-orientation="vertical"
				tabindex="0"
				onpointerdown={startPreviewResize}
			></div>

			<aside class="preview-col">
				<div class="preview-header">
					<h3>Preview</h3>
					<div class="mode-switch">
						<button
							type="button"
							class:active={previewMode === "overlay"}
							onclick={() => {
								previewMode = "overlay";
								saveLayout();
							}}
						>overlay</button>
						<button
							type="button"
							class:active={previewMode === "window"}
							onclick={() => {
								previewMode = "window";
								saveLayout();
							}}
						>window</button>
					</div>
				</div>

				<div class="preview-window">
					{#if previewMode === "window"}
						{#each channels as ch (ch.name)}
							{#if ch.effect === "flash"}
								<FlashWash
									channel={ch.name}
									defaultColor={ch.color}
									colors={ch.noteColors}
									maxOpacity={evaluateLane(ch.automations.maxOpacity, player.position) ?? ch.maxOpacity}
									adsr={ch.adsr}
								/>
							{:else if ch.effect === "strobe"}
								<Strobe channel={ch.name} color={ch.color} subdivisions={evaluateLane(ch.automations.strobeSubdivisions, player.position) ?? ch.strobeSubdivisions} {bpm} />
							{:else if ch.effect === "bloom"}
								<ShaderBloom
									channel={ch.name}
									color={ch.color}
									colors={ch.noteColors}
									adsr={ch.adsr}
									maxIntensity={evaluateLane(ch.automations.maxOpacity, player.position) ?? ch.maxOpacity}
								/>
							{/if}
						{/each}
					{:else}
						<div class="preview-placeholder">overlay mode — effects render fullscreen</div>
					{/if}
				</div>
			</aside>
		{/if}
	</div>

	<div
		class="splitter-h"
		role="separator"
		aria-orientation="horizontal"
		tabindex="0"
		onpointerdown={startTimelineResize}
	></div>

	<div class="timeline-wrap" style="height: {Math.floor(vh * timelineH)}px;">
		<Timeline
			width={vw - 16}
			height={Math.floor(vh * timelineH)}
			{selectedChannel}
			onSelectChannel={(name) => (selectedChannel = name)}
			automations={automationViews}
			onAddBreakpoint={handleAddBreakpoint}
			onMoveBreakpoint={handleMoveBreakpoint}
			onRemoveBreakpoint={handleRemoveBreakpoint}
		/>
	</div>
</div>

<!-- Live preview effects (overlay mode renders fullscreen, window mode renders inside the preview drawer) -->
{#if previewMode === "overlay"}
	{#each channels as ch (ch.name)}
		{#if ch.effect === "flash"}
			<FlashWash
				channel={ch.name}
				defaultColor={ch.color}
				colors={ch.noteColors}
				maxOpacity={evaluateLane(ch.automations.maxOpacity, player.position) ?? ch.maxOpacity}
				adsr={ch.adsr}
			/>
		{:else if ch.effect === "strobe"}
			<Strobe channel={ch.name} color={ch.color} subdivisions={evaluateLane(ch.automations.strobeSubdivisions, player.position) ?? ch.strobeSubdivisions} {bpm} />
		{:else if ch.effect === "bloom"}
			<ShaderBloom
				channel={ch.name}
				color={ch.color}
				colors={ch.noteColors}
				adsr={ch.adsr}
				maxIntensity={evaluateLane(ch.automations.maxOpacity, player.position) ?? ch.maxOpacity}
			/>
		{/if}
	{/each}
{/if}

<div
	class="debug-handle"
	style="right: {debugW}px; bottom: {timelinePx}px;"
	role="separator"
	aria-orientation="vertical"
	tabindex="0"
	title="drag to open debug"
	onpointerdown={startDebugResize}
></div>
<div class="debug-drawer" style="width: {debugW}px; bottom: {timelinePx}px;">
	{#if debugW > 30}
		<div class="debug-content">
			<LightshowDebug />
		</div>
	{/if}
</div>

<style>
	.studio {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 4px;
		color: #fff;
		font-family: ui-monospace, monospace;
		font-size: 12px;
		overflow: hidden;
	}
	.main-grid {
		display: grid;
		grid-template-columns: 200px 240px 1fr;
		gap: 4px;
		align-items: stretch;
		flex: 1;
		min-height: 0;
	}
	.timeline-wrap {
		flex-shrink: 0;
	}
	.splitter-v,
	.splitter-h {
		position: relative;
		background: transparent;
		transition: background 100ms;
		border-radius: 999px;
	}
	.splitter-v {
		cursor: col-resize;
	}
	.splitter-h {
		height: 2px;
		flex-shrink: 0;
		cursor: row-resize;
	}
	.splitter-v:hover,
	.splitter-v:active,
	.splitter-h:hover,
	.splitter-h:active {
		background: rgba(125, 249, 255, 0.5);
	}
	.splitter-v::before {
		content: "";
		position: absolute;
		inset: 0 -3px;
	}
	.splitter-h::before {
		content: "";
		position: absolute;
		inset: -3px 0;
	}
	.debug-handle {
		position: fixed;
		top: 0;
		bottom: 0;
		width: 6px;
		cursor: col-resize;
		z-index: 101;
		background: rgba(255, 255, 255, 0.04);
		transition: background 100ms;
	}
	.debug-handle:hover,
	.debug-handle:active {
		background: rgba(125, 249, 255, 0.5);
	}
	.debug-drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.92);
		border-left: 1px solid rgba(255, 255, 255, 0.15);
		z-index: 100;
		overflow-y: auto;
		overflow-x: hidden;
	}
	.debug-content {
		padding: 8px;
		min-width: 280px;
	}
	.debug-content :global(.debug) {
		position: static;
		max-width: none;
		min-width: 0;
		background: transparent;
		padding: 0;
	}
	.files-col,
	.library-col,
	.settings-col {
		overflow-y: auto;
		min-height: 0;
	}
	.files-col,
	.library-col,
	.settings-col,
	.preview-col {
		background: rgba(255, 255, 255, 0.04);
		border-radius: 6px;
		padding: 6px;
	}
	.preview-col {
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}
	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		margin-bottom: 6px;
	}
	.preview-header h3 {
		margin-bottom: 0;
	}
	.mode-switch {
		display: inline-flex;
		gap: 1px;
		background: rgba(255, 255, 255, 0.04);
		padding: 1px;
		border-radius: 3px;
	}
	.mode-switch button {
		padding: 2px 6px;
		font-size: 10px;
		background: transparent;
		color: rgba(255, 255, 255, 0.6);
		border-radius: 2px;
	}
	.mode-switch button.active {
		background: rgba(125, 249, 255, 0.2);
		color: #7df9ff;
	}
	.preview-window {
		flex: 1;
		position: relative;
		background: #000;
		border-radius: 4px;
		overflow: hidden;
		min-height: 0;
		transform: translateZ(0);
	}
	.preview-window :global(.flash-wash),
	.preview-window :global(.strobe),
	.preview-window :global(.shader-canvas) {
		position: fixed;
	}
	.preview-placeholder {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-style: italic;
		opacity: 0.5;
		font-size: 11px;
		text-align: center;
		padding: 12px;
	}
	.settings-col {
		min-height: 200px;
	}
	h3 {
		font-size: 11px;
		text-transform: uppercase;
		opacity: 0.6;
		margin-bottom: 5px;
		letter-spacing: 0.05em;
	}
	.hidden-file-label {
		display: block;
		margin-bottom: 4px;
	}
	.hidden-file-label input[type="file"] {
		display: none;
	}
	.add-btn {
		display: block;
		text-align: center;
		padding: 6px 8px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px dashed rgba(255, 255, 255, 0.2);
		border-radius: 3px;
		cursor: pointer;
		font-size: 11px;
	}
	.add-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	.file-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin: 6px 0;
	}
	.file-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid transparent;
		border-radius: 3px;
		cursor: pointer;
		font-family: inherit;
		font-size: 11px;
		color: #fff;
		text-align: left;
		min-width: 0;
	}
	.file-row:hover {
		background: rgba(255, 255, 255, 0.08);
	}
	.file-row.selected {
		background: rgba(125, 249, 255, 0.12);
		border-color: rgba(125, 249, 255, 0.4);
	}
	.file-row.audio-row {
		background: rgba(255, 255, 255, 0.08);
		cursor: default;
	}
	.fname {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ic {
		opacity: 0.6;
	}
	.bpm-row {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-bottom: 6px;
	}
	.actions.stacked {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.actions.stacked button {
		width: 100%;
	}
	.effect-cards {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.effect-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid transparent;
		border-radius: 4px;
		cursor: pointer;
		font-family: inherit;
		color: #fff;
		text-align: left;
	}
	.effect-card:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
	}
	.effect-card.active {
		background: rgba(125, 249, 255, 0.12);
		border-color: rgba(125, 249, 255, 0.5);
	}
	.effect-card:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.effect-card strong {
		font-size: 12px;
	}
	.effect-card span {
		font-size: 10px;
		opacity: 0.6;
	}
	:global(body) {
		background: #111;
	}
	.timeline-wrap > :global(.timeline) {
		width: 100% !important;
	}
	header {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
		height: 28px;
	}
	header h1 {
		font-size: 13px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 700;
	}
	.position-display {
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}
	.position-display .dim {
		opacity: 0.5;
	}
	.bpm-inline {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
	}
	.bpm-inline input {
		width: 5ch;
		field-sizing: content;
		height: 18px;
		font-size: 10px;
		padding: 0 4px;
		line-height: 18px;
		appearance: textfield;
		-moz-appearance: textfield;
	}
	.bpm-inline input::-webkit-inner-spin-button,
	.bpm-inline input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		appearance: none;
		margin: 0;
	}
	.header-actions {
		display: flex;
		gap: 4px;
		margin-left: auto;
	}
	.preview-toggle {
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.15);
		padding: 3px 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 3px;
		cursor: pointer;
	}
	.preview-toggle:hover {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
	}
	.preview-toggle.active {
		background: rgba(125, 249, 255, 0.15);
		color: #7df9ff;
		border-color: rgba(125, 249, 255, 0.5);
	}
	.header-actions button {
		padding: 4px 10px;
		font-size: 11px;
	}
	.hint {
		opacity: 0.5;
		font-size: 10px;
	}
	section {
		margin-bottom: 0;
		padding: 6px;
	}
	.files label {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 8px;
	}
	.lbl {
		min-width: 100px;
		opacity: 0.7;
	}
	.filename {
		opacity: 0.5;
		font-size: 11px;
	}
	h2 {
		font-size: 14px;
		margin-bottom: 12px;
	}
	.channel-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.channel-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 12px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid transparent;
		border-radius: 4px;
		text-align: left;
		font-family: inherit;
		font-size: 12px;
		color: #fff;
		cursor: pointer;
	}
	.channel-row:hover {
		background: rgba(255, 255, 255, 0.08);
	}
	.channel-row.selected {
		background: rgba(125, 249, 255, 0.1);
		border-color: rgba(125, 249, 255, 0.5);
	}
	.swatch {
		width: 16px;
		height: 16px;
		border-radius: 3px;
		flex-shrink: 0;
	}
	.ch-name {
		flex: 1;
	}
	.ch-meta {
		opacity: 0.5;
		font-size: 11px;
	}
	.editor h2,
	.editor h3 {
		font-size: 13px;
		margin-bottom: 6px;
	}
	.editor h3 {
		margin-top: 8px;
	}
	.editor-grid {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.editor-grid label {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.editor-grid .lbl {
		min-width: 120px;
	}
	.hex-input {
		max-width: 100px;
	}
	.note-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 4px;
	}
	.auto-section {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 4px 6px;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 4px;
	}
	.auto-toggles {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}
	.auto-toggle {
		padding: 3px 6px;
		font-size: 10px;
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 3px;
	}
	.auto-toggle.active {
		background: rgba(125, 249, 255, 0.15);
		color: #7df9ff;
		border-color: rgba(125, 249, 255, 0.5);
	}
	.adsr-block {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 6px;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 4px;
	}
	.adsr-header {
		display: flex;
		justify-content: space-between;
	}
	.adsr-sliders {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 6px;
	}
	.adsr-slider {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 2px;
	}
	.adsr-slider span:first-child {
		font-size: 10px;
		opacity: 0.6;
	}
	.adsr-slider .num {
		font-size: 9px;
		opacity: 0.5;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.adsr-slider input[type="range"] {
		width: 100%;
	}
	.note-row {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		background: rgba(255, 255, 255, 0.04);
		border-radius: 3px;
	}
	.note-name {
		min-width: 32px;
		font-variant-numeric: tabular-nums;
	}
	.clear-btn {
		background: none;
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.6);
		width: 20px;
		height: 20px;
		padding: 0;
		font-size: 12px;
		line-height: 1;
		border-radius: 3px;
		cursor: pointer;
	}
	.clear-btn:hover {
		background: rgba(255, 64, 64, 0.2);
		color: #ff8080;
	}
	.empty-hint {
		opacity: 0.5;
		font-size: 11px;
		font-style: italic;
	}
	.channel-hint {
		opacity: 0.5;
		font-size: 12px;
		font-style: italic;
		text-align: center;
	}
	.num {
		min-width: 32px;
		opacity: 0.7;
	}
	input[type="number"],
	input[type="text"],
	input[type="range"],
	select {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.15);
		padding: 4px 6px;
		border-radius: 3px;
		font-family: inherit;
		font-size: inherit;
		width: 100%;
	}
	input[type="file"] {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.15);
		padding: 4px 6px;
		border-radius: 3px;
		font-family: inherit;
		font-size: inherit;
	}
	input[type="file"]::file-selector-button {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.15);
		padding: 2px 8px;
		border-radius: 3px;
		font-family: inherit;
		font-size: inherit;
		margin-right: 8px;
		cursor: pointer;
	}
	input[type="range"] {
		flex: 1;
	}
	input[type="color"] {
		width: 36px;
		height: 24px;
		border: none;
		background: none;
		padding: 0;
		cursor: pointer;
	}
	input[type="file"] {
		flex: 1;
	}
	button {
		background: #7df9ff;
		color: #000;
		border: none;
		padding: 8px 16px;
		border-radius: 3px;
		font-family: inherit;
		font-size: inherit;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	button.danger {
		background: rgba(255, 64, 64, 0.2);
		color: #ff6b6b;
	}
	.saved-tag {
		opacity: 0.7;
		font-size: 11px;
	}
	.actions {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.status {
		opacity: 0.6;
		margin-left: auto;
	}
	.timeline-wrap {
		overflow-x: auto;
	}
	.status-section {
		font-size: 12px;
	}
	.status-section.error {
		background: rgba(255, 64, 64, 0.1);
		color: #ff8080;
	}
	.status-section.warn {
		background: rgba(255, 200, 0, 0.1);
		color: #ffd866;
	}
	.status-section pre {
		margin-top: 8px;
		white-space: pre-wrap;
		font-size: 11px;
		opacity: 0.8;
	}
</style>
