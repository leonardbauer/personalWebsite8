const DB_NAME = "lightshow-studio";
const DB_VERSION = 1;
const STORE = "files";
const CONFIG_KEY = "lightshow-studio-config";

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			if (!req.result.objectStoreNames.contains(STORE)) {
				req.result.createObjectStore(STORE);
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

type StoredFile = {
	buffer: ArrayBuffer;
	name: string;
	type: string;
	lastModified: number;
};

export async function putFile(key: string, file: File): Promise<void> {
	const buffer = await file.arrayBuffer();
	const record: StoredFile = {
		buffer,
		name: file.name,
		type: file.type,
		lastModified: file.lastModified
	};
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).put(record, key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function getFile(key: string): Promise<File | null> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readonly");
		const req = tx.objectStore(STORE).get(key);
		req.onsuccess = () => {
			const result = req.result as StoredFile | File | Blob | undefined;
			if (!result) {
				resolve(null);
				return;
			}
			if (result instanceof File) {
				resolve(result);
				return;
			}
			if (result instanceof Blob) {
				resolve(new File([result], "stored", { type: result.type }));
				return;
			}
			if (typeof result === "object" && "buffer" in result) {
				resolve(
					new File([result.buffer], result.name, {
						type: result.type,
						lastModified: result.lastModified
					})
				);
				return;
			}
			resolve(null);
		};
		req.onerror = () => reject(req.error);
	});
}

export async function deleteFile(key: string): Promise<void> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).delete(key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function listFileKeys(): Promise<string[]> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readonly");
		const req = tx.objectStore(STORE).getAllKeys();
		req.onsuccess = () => resolve(req.result as string[]);
		req.onerror = () => reject(req.error);
	});
}

export type StudioConfig = {
	bpm: number;
	channels: Array<{
		fileName?: string;
		name: string;
		color: string;
		noteColors?: Record<string, string>;
		maxOpacity: number;
		decay: number;
		offset: number;
	}>;
	audioKey: string | null;
	midiKeys: string[];
};

export function loadConfig(): StudioConfig | null {
	if (typeof localStorage === "undefined") return null;
	try {
		const raw = localStorage.getItem(CONFIG_KEY);
		return raw ? (JSON.parse(raw) as StudioConfig) : null;
	} catch {
		return null;
	}
}

export function saveConfig(config: StudioConfig): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
	} catch (e) {
		console.warn("studio config save failed", e);
	}
}
