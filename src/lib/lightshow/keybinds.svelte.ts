export type Keybind = {
	id: string;
	description: string;
	key: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	meta?: boolean;
	handler: (e: KeyboardEvent) => void;
};

class Keybinds {
	binds = $state<Keybind[]>([]);

	register(bind: Keybind) {
		this.binds = [...this.binds, bind];
		return () => {
			this.binds = this.binds.filter((b) => b !== bind);
		};
	}

	#typing(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;
		const tag = target.tagName;
		return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
	}

	handle = (e: KeyboardEvent) => {
		if (this.#typing(e.target)) return;
		for (const b of this.binds) {
			if (
				b.key.toLowerCase() === e.key.toLowerCase() &&
				!!b.ctrl === e.ctrlKey &&
				!!b.shift === e.shiftKey &&
				!!b.alt === e.altKey &&
				!!b.meta === e.metaKey
			) {
				e.preventDefault();
				e.stopPropagation();
				b.handler(e);
				return;
			}
		}
	};
}

export const keybinds = new Keybinds();

if (typeof window !== "undefined") {
	window.addEventListener("keydown", keybinds.handle, { capture: true });
	(window as unknown as { keybinds: Keybinds }).keybinds = keybinds;
}
