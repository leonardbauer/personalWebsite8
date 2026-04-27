<script lang="ts">
	import { onMount } from "svelte";
	import { lightshow } from "$lib/lightshow/store.svelte";
	import tgpu from "typegpu";
	import * as d from "typegpu/data";
	import { envelope, envelopeDuration, type ADSR, DEFAULT_ADSR } from "$lib/lightshow/envelope";

	let {
		channel,
		color = "#ffffff",
		colors = {},
		adsr = DEFAULT_ADSR,
		maxIntensity = 1
	}: {
		channel: string;
		color?: string;
		colors?: Record<string, string>;
		adsr?: ADSR;
		maxIntensity?: number;
	} = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let supported = $state(true);

	const MAX_BLOOMS = 16;

	const Bloom = d.struct({
		px: d.f32,
		py: d.f32,
		r: d.f32,
		g: d.f32,
		b: d.f32,
		intensity: d.f32,
		age: d.f32,
		_pad: d.f32
	});
	const Globals = d.struct({
		resW: d.f32,
		resH: d.f32,
		count: d.u32,
		_pad: d.u32
	});

	const layout = tgpu.bindGroupLayout({
		globals: { uniform: Globals },
		blooms: { storage: d.arrayOf(Bloom, MAX_BLOOMS), access: "readonly" }
	});

	type BloomState = {
		x: number;
		y: number;
		r: number;
		g: number;
		b: number;
		startedAt: number;
		hold: number;
		velocity: number;
	};

	const blooms: BloomState[] = [];

	function hexToRgb(hex: string): [number, number, number] {
		const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
		if (!m) return [1, 1, 1];
		const v = m[1];
		return [
			parseInt(v.slice(0, 2), 16) / 255,
			parseInt(v.slice(2, 4), 16) / 255,
			parseInt(v.slice(4, 6), 16) / 255
		];
	}

	const SHADER_CODE = /* wgsl */ `
		struct Bloom { px: f32, py: f32, r: f32, g: f32, b: f32, intensity: f32, age: f32, _pad: f32 };
		struct Globals { resW: f32, resH: f32, count: u32, _pad: u32 };

		@group(0) @binding(0) var<uniform> globals: Globals;
		@group(0) @binding(1) var<storage, read> blooms: array<Bloom, ${MAX_BLOOMS}>;

		@vertex
		fn vs(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4f {
			let pos = array<vec2f, 6>(
				vec2f(-1.0, -1.0), vec2f( 1.0, -1.0), vec2f(-1.0,  1.0),
				vec2f(-1.0,  1.0), vec2f( 1.0, -1.0), vec2f( 1.0,  1.0)
			);
			return vec4f(pos[vid], 0.0, 1.0);
		}

		@fragment
		fn fs(@builtin(position) fragPos: vec4f) -> @location(0) vec4f {
			let uv = vec2f(fragPos.x / globals.resW, fragPos.y / globals.resH);
			var color = vec3f(0.0);
			var alpha = 0.0;
			let aspect = globals.resW / globals.resH;

			for (var i = 0u; i < globals.count; i = i + 1u) {
				let b = blooms[i];
				let d = vec2f((uv.x - b.px) * aspect, uv.y - b.py);
				let dist = length(d);
				let radius = 0.15 + b.age * 0.7;
				let falloff = exp(-pow(dist / radius, 2.0));
				let strength = b.intensity * falloff;
				let col = vec3f(b.r, b.g, b.b);
				color = color + col * strength;
				alpha = alpha + strength;
			}

			return vec4f(color, min(1.0, alpha));
		}
	`;

	onMount(() => {
		let stop = false;
		let unsubscribe: (() => void) | null = null;
		let rafId: number | null = null;
		let resizeObserver: ResizeObserver | null = null;

		(async () => {
			console.log("[ShaderBloom] init for channel", channel);
			if (!navigator.gpu) {
				console.warn("[ShaderBloom] navigator.gpu not available");
				supported = false;
				return;
			}
			if (!canvas) {
				console.warn("[ShaderBloom] canvas not bound yet");
				supported = false;
				return;
			}

			const root = await tgpu.init();
			if (stop) return;
			if (!root) {
				console.warn("[ShaderBloom] tgpu.init failed");
				supported = false;
				return;
			}

			const device = root.device;
			device.addEventListener("uncapturederror", (ev) => {
				console.error(
					"[ShaderBloom] GPU error:",
					(ev as GPUUncapturedErrorEvent).error
				);
			});
			device.lost.then((info) => {
				console.error("[ShaderBloom] device lost:", info.reason, info.message);
			});
			const context = canvas.getContext("webgpu");
			if (!context) {
				console.warn("[ShaderBloom] getContext('webgpu') returned null");
				supported = false;
				return;
			}
			const format = navigator.gpu.getPreferredCanvasFormat();
			console.log("[ShaderBloom] preferredFormat:", format);
			context.configure({ device, format, alphaMode: "premultiplied" });
			console.log("[ShaderBloom] WebGPU ready");

			const globalsBuffer = root.createBuffer(Globals).$usage("uniform");
			const bloomsBuffer = root
				.createBuffer(d.arrayOf(Bloom, MAX_BLOOMS))
				.$usage("storage");

			const bindGroup = root.createBindGroup(layout, {
				globals: globalsBuffer,
				blooms: bloomsBuffer
			});

			const module = device.createShaderModule({ code: SHADER_CODE });
			module.getCompilationInfo().then((info) => {
				for (const msg of info.messages) {
					const tag = `[ShaderBloom shader L${msg.lineNum}:${msg.linePos}]`;
					if (msg.type === "error") console.error(tag, msg.message);
					else if (msg.type === "warning") console.warn(tag, msg.message);
					else console.log(tag, msg.message);
				}
			});

			const pipeline = device.createRenderPipeline({
				layout: device.createPipelineLayout({
					bindGroupLayouts: [root.unwrap(layout)]
				}),
				vertex: { module, entryPoint: "vs" },
				fragment: {
					module,
					entryPoint: "fs",
					targets: [
						{
							format,
							blend: {
								color: { srcFactor: "one", dstFactor: "one", operation: "add" },
								alpha: { srcFactor: "one", dstFactor: "one", operation: "add" }
							}
						}
					]
				},
				primitive: { topology: "triangle-list" }
			});

			function resize() {
				if (!canvas) return;
				const dpr = Math.min(window.devicePixelRatio || 1, 2);
				const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
				const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
				if (canvas.width !== w) canvas.width = w;
				if (canvas.height !== h) canvas.height = h;
			}
			resize();
			resizeObserver = new ResizeObserver(resize);
			resizeObserver.observe(canvas);

			unsubscribe = lightshow.subscribe((trigger) => {
				if (trigger.channel !== channel) return;
				const noteName = trigger.event.noteName;
				const noteOverride = colors[noteName];
				const colorHex = noteOverride ?? color;
				console.log(`[bloom] ${channel} note=${noteName} hex=${colorHex} (${noteOverride ? "per-note" : "default"})`);
				const [r, g, b] = hexToRgb(colorHex);
				const next: BloomState = {
					x: 0.5 + (Math.random() - 0.5) * 0.6,
					y: 0.5 + (Math.random() - 0.5) * 0.6,
					r,
					g,
					b,
					startedAt: performance.now() / 1000,
					hold: trigger.event.duration,
					velocity: trigger.event.velocity * maxIntensity
				};
				if (blooms.length >= MAX_BLOOMS) blooms.shift();
				blooms.push(next);
				if (rafId === null) rafId = requestAnimationFrame(frame);
			});

			const rawBindGroup = root.unwrap(bindGroup);
			const rawGlobalsBuf = root.unwrap(globalsBuffer);
			const rawBloomsBuf = root.unwrap(bloomsBuffer);

			const globalsArr = new ArrayBuffer(16);
			const globalsView = new DataView(globalsArr);
			const FLOATS_PER_BLOOM = 8;
			const bloomsArr = new Float32Array(MAX_BLOOMS * FLOATS_PER_BLOOM);

			function frame() {
				if (stop || !canvas) {
					rafId = null;
					return;
				}
				const now = performance.now() / 1000;
				for (let i = blooms.length - 1; i >= 0; i--) {
					const elapsed = now - blooms[i].startedAt;
					if (elapsed > envelopeDuration(blooms[i].hold, adsr)) blooms.splice(i, 1);
				}

				const count = Math.min(blooms.length, MAX_BLOOMS);
				if (count === 0) {
					rafId = null;
					return;
				}
				bloomsArr.fill(0);
				for (let i = 0; i < count; i++) {
					const b = blooms[i];
					const elapsed = now - b.startedAt;
					const total = envelopeDuration(b.hold, adsr);
					const env = envelope(elapsed, b.hold, adsr) * b.velocity;
					const off = i * FLOATS_PER_BLOOM;
					bloomsArr[off + 0] = b.x;
					bloomsArr[off + 1] = b.y;
					bloomsArr[off + 2] = b.r;
					bloomsArr[off + 3] = b.g;
					bloomsArr[off + 4] = b.b;
					bloomsArr[off + 5] = env;
					bloomsArr[off + 6] = total > 0 ? Math.min(1, elapsed / total) : 0;
					bloomsArr[off + 7] = 0;
				}
				device.queue.writeBuffer(rawBloomsBuf, 0, bloomsArr);

				globalsView.setFloat32(0, canvas.width, true);
				globalsView.setFloat32(4, canvas.height, true);
				globalsView.setUint32(8, count, true);
				globalsView.setUint32(12, 0, true);
				device.queue.writeBuffer(rawGlobalsBuf, 0, globalsArr);

				const encoder = device.createCommandEncoder();
				const view = context!.getCurrentTexture().createView();
				const pass = encoder.beginRenderPass({
					colorAttachments: [
						{
							view,
							clearValue: { r: 0, g: 0, b: 0, a: 0 },
							loadOp: "clear",
							storeOp: "store"
						}
					]
				});
				pass.setPipeline(pipeline);
				pass.setBindGroup(0, rawBindGroup);
				pass.draw(6);
				pass.end();
				device.queue.submit([encoder.finish()]);

				rafId = requestAnimationFrame(frame);
			}
		})().catch((e) => {
			console.warn("[ShaderBloom] init failed", e);
			supported = false;
		});

		return () => {
			stop = true;
			if (rafId !== null) cancelAnimationFrame(rafId);
			unsubscribe?.();
			resizeObserver?.disconnect();
		};
	});
</script>

<canvas bind:this={canvas} class="shader-canvas" class:hidden={!supported}></canvas>

<style>
	.shader-canvas {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 4;
	}
	.shader-canvas.hidden {
		display: none;
	}
</style>
