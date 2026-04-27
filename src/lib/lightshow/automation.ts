export type Breakpoint = {
	time: number;
	value: number;
	curve?: "linear" | "hold" | "ease";
};

export type AutomationLane = {
	enabled: boolean;
	breakpoints: Breakpoint[];
};

export function evaluateLane(lane: AutomationLane | undefined, time: number): number | null {
	if (!lane || !lane.enabled) return null;
	const bps = lane.breakpoints;
	if (!bps.length) return null;
	if (bps.length === 1) return bps[0].value;
	if (time <= bps[0].time) return bps[0].value;
	if (time >= bps[bps.length - 1].time) return bps[bps.length - 1].value;

	for (let i = 0; i < bps.length - 1; i++) {
		const a = bps[i];
		const b = bps[i + 1];
		if (time < a.time || time >= b.time) continue;
		if (a.curve === "hold") return a.value;
		const span = b.time - a.time;
		if (span <= 0) return b.value;
		let t = (time - a.time) / span;
		if (a.curve === "ease") t = t * t * (3 - 2 * t);
		return a.value + (b.value - a.value) * t;
	}
	return bps[bps.length - 1].value;
}

export function defaultLane(currentValue: number, songDuration: number): AutomationLane {
	return {
		enabled: true,
		breakpoints: [
			{ time: 0, value: currentValue, curve: "linear" },
			{ time: Math.max(1, songDuration || 60), value: currentValue, curve: "linear" }
		]
	};
}
