export type ADSR = {
	attack: number;
	decay: number;
	sustain: number;
	release: number;
};

export const DEFAULT_ADSR: ADSR = {
	attack: 0,
	decay: 0,
	sustain: 1,
	release: 0.1
};

function noteOnValue(t: number, adsr: ADSR): number {
	const { attack, decay, sustain } = adsr;
	const s = Math.max(0, Math.min(1, sustain));
	if (attack > 0 && t < attack) return t / attack;
	const dt = t - attack;
	if (decay > 0 && dt < decay) return 1 - (1 - s) * (dt / decay);
	return s;
}

export function envelope(elapsed: number, hold: number, adsr: ADSR): number {
	if (elapsed < 0) return 0;
	if (elapsed < hold) return noteOnValue(elapsed, adsr);
	const releaseStartValue = noteOnValue(hold, adsr);
	const releaseElapsed = elapsed - hold;
	const { release } = adsr;
	if (release > 0 && releaseElapsed < release) {
		return releaseStartValue * (1 - releaseElapsed / release);
	}
	return 0;
}

export function envelopeDuration(hold: number, adsr: ADSR): number {
	return hold + adsr.release;
}
