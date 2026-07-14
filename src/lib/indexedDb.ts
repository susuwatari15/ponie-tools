/**
 * Minimal typed IndexedDB wrapper for the app's persisted data.
 *
 * Layout (DB "ponie-tools", v1):
 *  - object store "snapshots" (keyPath "id") — one record per saved snapshot;
 *    snapshots embed a full swagger spec, so per-record storage avoids
 *    rewriting the whole set (and blowing past quotas) on every save.
 *  - object store "keyval" (out-of-line keys) — small values: the profiles
 *    array, the current raw-json draft, and the selected-profile id.
 *
 * On first open we migrate the legacy localStorage keys into these stores and
 * then remove them, so existing users keep their data.
 */

const DB_NAME = "ponie-tools";
const DB_VERSION = 1;

export const SNAPSHOTS_STORE = "snapshots";
export const KEYVAL_STORE = "keyval";

/** keyval keys */
export const PROFILES_KEY = "profiles";
export const SELECTED_PROFILE_KEY = "selected-profile";
export const RAW_JSON_KEY = "raw-json";

/** Legacy localStorage keys migrated once on first open. */
const LEGACY_PROFILES_KEY = "swagger-minifier-profiles";
const LEGACY_SELECTED_PROFILE_KEY = "swagger-minifier-selected-profile";
const LEGACY_SNAPSHOTS_KEY = "swagger-minifier-saved-snapshots";
const LEGACY_RAW_JSON_KEY = "swagger-minifier-raw-json";

export function isIndexedDbAvailable(): boolean {
	return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

function migrateFromLocalStorage(tx: IDBTransaction): void {
	if (typeof localStorage === "undefined") return;

	const snapshotsRaw = safeGetItem(LEGACY_SNAPSHOTS_KEY);
	if (snapshotsRaw) {
		try {
			const parsed = JSON.parse(snapshotsRaw) as unknown;
			if (Array.isArray(parsed)) {
				const store = tx.objectStore(SNAPSHOTS_STORE);
				for (const item of parsed) {
					if (item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string") {
						store.put(item);
					}
				}
			}
		} catch {
			// ignore malformed legacy data
		}
	}

	const keyval = tx.objectStore(KEYVAL_STORE);

	const profilesRaw = safeGetItem(LEGACY_PROFILES_KEY);
	if (profilesRaw) {
		try {
			const parsed = JSON.parse(profilesRaw) as unknown;
			if (Array.isArray(parsed)) keyval.put(parsed, PROFILES_KEY);
		} catch {
			// ignore
		}
	}

	const selectedProfile = safeGetItem(LEGACY_SELECTED_PROFILE_KEY);
	if (selectedProfile) keyval.put(selectedProfile, SELECTED_PROFILE_KEY);

	const rawJson = safeGetItem(LEGACY_RAW_JSON_KEY);
	if (rawJson) keyval.put(rawJson, RAW_JSON_KEY);
}

function cleanupLegacyLocalStorage(): void {
	if (typeof localStorage === "undefined") return;
	for (const key of [
		LEGACY_SNAPSHOTS_KEY,
		LEGACY_PROFILES_KEY,
		LEGACY_SELECTED_PROFILE_KEY,
		LEGACY_RAW_JSON_KEY,
	]) {
		try {
			localStorage.removeItem(key);
		} catch {
			// ignore
		}
	}
}

function safeGetItem(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

export function openDb(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;

	dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
		if (!isIndexedDbAvailable()) {
			reject(new Error("IndexedDB is not available"));
			return;
		}

		let didUpgrade = false;
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = (event) => {
			const db = request.result;
			const tx = request.transaction;
			if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
				db.createObjectStore(SNAPSHOTS_STORE, { keyPath: "id" });
			}
			if (!db.objectStoreNames.contains(KEYVAL_STORE)) {
				db.createObjectStore(KEYVAL_STORE);
			}
			if (event.oldVersion < 1 && tx) {
				didUpgrade = true;
				migrateFromLocalStorage(tx);
			}
		};

		request.onsuccess = () => {
			// Only clear legacy keys once the migrating transaction has committed.
			if (didUpgrade) cleanupLegacyLocalStorage();
			resolve(request.result);
		};

		request.onerror = () => reject(request.error);
		request.onblocked = () => reject(new Error("IndexedDB open blocked"));
	});

	// Allow retrying after a failed open.
	dbPromise.catch(() => {
		dbPromise = null;
	});

	return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function txDone(tx: IDBTransaction): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error);
	});
}

export async function idbGetAll<T>(store: string): Promise<T[]> {
	const db = await openDb();
	return requestToPromise<T[]>(
		db.transaction(store, "readonly").objectStore(store).getAll(),
	);
}

export async function idbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
	const db = await openDb();
	return requestToPromise<T | undefined>(
		db.transaction(store, "readonly").objectStore(store).get(key),
	);
}

/** Put a record. `key` is required for out-of-line stores (keyval), omitted for keyPath stores. */
export async function idbPut(
	store: string,
	value: unknown,
	key?: IDBValidKey,
): Promise<void> {
	const db = await openDb();
	const tx = db.transaction(store, "readwrite");
	if (key === undefined) tx.objectStore(store).put(value);
	else tx.objectStore(store).put(value, key);
	return txDone(tx);
}

export async function idbDelete(store: string, key: IDBValidKey): Promise<void> {
	const db = await openDb();
	const tx = db.transaction(store, "readwrite");
	tx.objectStore(store).delete(key);
	return txDone(tx);
}

export type StorageWriteError = "quota" | "unknown";

export function classifyWriteError(e: unknown): StorageWriteError {
	const name =
		typeof e === "object" && e !== null && "name" in e
			? String((e as { name?: string }).name)
			: "";
	if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
		return "quota";
	}
	return "unknown";
}
