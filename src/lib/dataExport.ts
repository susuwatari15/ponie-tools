/**
 * Backup / restore of everything the app keeps in IndexedDB (see `indexedDb.ts`):
 * the keyval entries (profiles, minifier draft, prefs, selections, presets…),
 * snapshot metadata and each snapshot's spec text, as one JSON file.
 */
import {
	classifyWriteError,
	idbWrite,
	KEYVAL_STORE,
	LAST_TOOL_KEY,
	MINIFIER_PREFS_KEY,
	MINIFIER_SELECTIONS_KEY,
	openDb,
	PROFILES_KEY,
	RAW_JSON_KEY,
	SELECTED_PROFILE_KEY,
	SELECTION_PRESETS_KEY,
	SNAPSHOT_JSON_STORE,
	SNAPSHOTS_STORE,
} from "./indexedDb";
import { clearSessionPasswords, isProfile, type SwaggerProfile } from "./swaggerProfilesStorage";
import { isPreset, type SelectionPreset } from "./swaggerPresetsStorage";
import { isSnapshot, type SavedSnapshot } from "./swaggerSavedSnapshotsStorage";

export const BACKUP_FORMAT = "ponie-tools-backup";
export const BACKUP_VERSION = 1;

export type BackupData = {
	format: typeof BACKUP_FORMAT;
	version: number;
	exportedAt: string;
	keyval: Record<string, unknown>;
	snapshots: SavedSnapshot[];
	/** Spec text per snapshot id. */
	snapshotJson: Record<string, string>;
};

export type BackupSummary = {
	exportedAt: string;
	snapshots: number;
	profiles: number;
	/** Profiles in the file that carry a password. */
	passwords: number;
	presets: number;
	hasDraft: boolean;
};

export type ImportMode = "merge" | "replace";

export type ParsedBackup =
	{ ok: true; data: BackupData; summary: BackupSummary } | { ok: false; error: string };

/** All `[key, value]` pairs of a store (out-of-line keys included). */
async function readEntries(store: string): Promise<[IDBValidKey, unknown][]> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const entries: [IDBValidKey, unknown][] = [];
		const request = db.transaction(store, "readonly").objectStore(store).openCursor();
		request.onsuccess = () => {
			const cursor = request.result;
			if (!cursor) {
				resolve(entries);
				return;
			}
			entries.push([cursor.primaryKey, cursor.value]);
			cursor.continue();
		};
		request.onerror = () => reject(request.error);
	});
}

async function readKeyval(): Promise<Record<string, unknown>> {
	const entries = await readEntries(KEYVAL_STORE);
	return Object.fromEntries(entries.filter(([key]) => typeof key === "string")) as Record<
		string,
		unknown
	>;
}

const withoutPassword = (profile: SwaggerProfile): SwaggerProfile => ({ ...profile, password: "" });

export async function exportAll({
	includePasswords = false,
}: { includePasswords?: boolean } = {}): Promise<Blob> {
	const [keyval, snapshotEntries, jsonEntries] = await Promise.all([
		readKeyval(),
		readEntries(SNAPSHOTS_STORE),
		readEntries(SNAPSHOT_JSON_STORE),
	]);

	// "Ask each session" passwords are never stored, so there is nothing to leak there.
	const profiles = keyval[PROFILES_KEY];
	if (Array.isArray(profiles)) {
		keyval[PROFILES_KEY] = profiles
			.filter(isProfile)
			.map((profile) => (includePasswords ? profile : withoutPassword(profile)));
	}

	const snapshots = snapshotEntries.map(([, value]) => value).filter(isSnapshot);
	const ids = new Set(snapshots.map((snap) => snap.id));
	const snapshotJson: Record<string, string> = {};
	for (const [key, value] of jsonEntries) {
		if (typeof key === "string" && ids.has(key) && typeof value === "string") {
			snapshotJson[key] = value;
		}
	}

	const data: BackupData = {
		format: BACKUP_FORMAT,
		version: BACKUP_VERSION,
		exportedAt: new Date().toISOString(),
		keyval,
		snapshots,
		snapshotJson,
	};
	return new Blob([JSON.stringify(data)], { type: "application/json" });
}

export function backupFileName(date = new Date()): string {
	return `ponie-tools-backup-${date.toISOString().slice(0, 10)}.json`;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Keeps only well-formed values for the keys this build knows. Unknown keys
 * (from a newer build) pass through — every reader validates on read anyway.
 */
function sanitizeKeyval(keyval: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(keyval)) {
		switch (key) {
			case PROFILES_KEY:
				if (Array.isArray(value)) {
					out[key] = value
						.filter(isProfile)
						.map((profile) => (profile.askPassword ? withoutPassword(profile) : profile));
				}
				break;
			case SELECTION_PRESETS_KEY:
				if (Array.isArray(value)) out[key] = value.filter(isPreset);
				break;
			case MINIFIER_SELECTIONS_KEY:
				if (isRecord(value)) {
					out[key] = Object.fromEntries(
						Object.entries(value).filter(
							([, ids]) => Array.isArray(ids) && ids.every((id) => typeof id === "string"),
						),
					);
				}
				break;
			case SELECTED_PROFILE_KEY:
			case RAW_JSON_KEY:
				if (typeof value === "string") out[key] = value;
				break;
			case MINIFIER_PREFS_KEY:
			case LAST_TOOL_KEY:
				if (isRecord(value)) out[key] = value;
				break;
			default:
				out[key] = value;
		}
	}
	return out;
}

/** Validates parsed JSON as a backup, dropping malformed records. */
export function parseBackup(value: unknown): ParsedBackup {
	if (!isRecord(value) || value.format !== BACKUP_FORMAT) {
		return { ok: false, error: "This isn't a Ponie Tools backup file." };
	}
	if (typeof value.version !== "number" || value.version > BACKUP_VERSION) {
		return {
			ok: false,
			error: "This backup comes from a newer version of Ponie Tools. Update the app and retry.",
		};
	}

	const json = isRecord(value.snapshotJson) ? value.snapshotJson : {};
	const snapshotJson: Record<string, string> = {};
	// A snapshot without its spec text is useless, so both halves must be present.
	const snapshots = (Array.isArray(value.snapshots) ? value.snapshots : [])
		.filter(isSnapshot)
		.filter((snap) => typeof json[snap.id] === "string");
	for (const snap of snapshots) snapshotJson[snap.id] = json[snap.id] as string;

	const keyval = sanitizeKeyval(isRecord(value.keyval) ? value.keyval : {});
	const profiles = (keyval[PROFILES_KEY] as SwaggerProfile[] | undefined) ?? [];
	const data: BackupData = {
		format: BACKUP_FORMAT,
		version: value.version,
		exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : "",
		keyval,
		snapshots,
		snapshotJson,
	};
	return {
		ok: true,
		data,
		summary: {
			exportedAt: data.exportedAt,
			snapshots: snapshots.length,
			profiles: profiles.length,
			passwords: profiles.filter((profile) => profile.password).length,
			presets: ((keyval[SELECTION_PRESETS_KEY] as SelectionPreset[] | undefined) ?? []).length,
			hasDraft: typeof keyval[RAW_JSON_KEY] === "string" && Boolean(keyval[RAW_JSON_KEY]),
		},
	};
}

export async function readBackupFile(file: File): Promise<ParsedBackup> {
	try {
		return parseBackup(JSON.parse(await file.text()) as unknown);
	} catch {
		return { ok: false, error: "The file isn't valid JSON." };
	}
}

/** Merges two id-keyed lists; `incoming` wins, existing order first. */
function mergeById<T extends { id: string }>(
	existing: T[],
	incoming: T[],
	combine: (current: T, next: T) => T = (_, next) => next,
): T[] {
	const byId = new Map(existing.map((item) => [item.id, item]));
	for (const item of incoming) {
		const current = byId.get(item.id);
		byId.set(item.id, current ? combine(current, item) : item);
	}
	return [...byId.values()];
}

/**
 * Profiles, presets and selections are combined (the file wins on the same id,
 * but a stored password is kept when the file has none); single values
 * (draft, prefs, selected profile…) are filled only where nothing is stored.
 */
function mergeKeyval(
	existing: Record<string, unknown>,
	incoming: Record<string, unknown>,
): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...existing };
	for (const [key, value] of Object.entries(incoming)) {
		const current = existing[key];
		if (key === PROFILES_KEY && Array.isArray(current)) {
			merged[key] = mergeById(
				current.filter(isProfile),
				value as SwaggerProfile[],
				(was, next) => ({
					...next,
					password: next.password || was.password,
				}),
			);
		} else if (key === SELECTION_PRESETS_KEY && Array.isArray(current)) {
			merged[key] = mergeById(current.filter(isPreset), value as SelectionPreset[]);
		} else if (key === MINIFIER_SELECTIONS_KEY && isRecord(current) && isRecord(value)) {
			merged[key] = { ...current, ...value };
		} else if (current === undefined) {
			merged[key] = value;
		}
	}
	return merged;
}

/**
 * Restores a backup. "replace" wipes all stored data first; "merge" adds the
 * file's snapshots and combines keyval entries (see `mergeKeyval`).
 */
export async function importAll(
	source: File | BackupData,
	{ mode }: { mode: ImportMode },
): Promise<ParsedBackup> {
	const parsed = source instanceof File ? await readBackupFile(source) : parseBackup(source);
	if (!parsed.ok) return parsed;
	const { data } = parsed;

	try {
		const keyval = mode === "replace" ? data.keyval : mergeKeyval(await readKeyval(), data.keyval);
		await idbWrite([KEYVAL_STORE, SNAPSHOTS_STORE, SNAPSHOT_JSON_STORE], (tx) => {
			const keyvalStore = tx.objectStore(KEYVAL_STORE);
			const snapshotStore = tx.objectStore(SNAPSHOTS_STORE);
			const jsonStore = tx.objectStore(SNAPSHOT_JSON_STORE);
			if (mode === "replace") {
				keyvalStore.clear();
				snapshotStore.clear();
				jsonStore.clear();
			}
			for (const [key, value] of Object.entries(keyval)) keyvalStore.put(value, key);
			for (const snap of data.snapshots) {
				snapshotStore.put(snap);
				jsonStore.put(data.snapshotJson[snap.id], snap.id);
			}
		});
		if (mode === "replace") clearSessionPasswords();
		return parsed;
	} catch (e: unknown) {
		return {
			ok: false,
			error:
				classifyWriteError(e) === "quota"
					? "Browser storage is full — free some space and retry."
					: "Couldn't write the backup to browser storage.",
		};
	}
}

/** Deletes every snapshot, profile, draft and preference stored in IndexedDB. */
export async function clearAllData(): Promise<void> {
	await idbWrite([KEYVAL_STORE, SNAPSHOTS_STORE, SNAPSHOT_JSON_STORE], (tx) => {
		tx.objectStore(KEYVAL_STORE).clear();
		tx.objectStore(SNAPSHOTS_STORE).clear();
		tx.objectStore(SNAPSHOT_JSON_STORE).clear();
	});
	clearSessionPasswords();
}

export type StorageSummary = {
	snapshots: number;
	/** Sum of stored spec text lengths, in characters. */
	snapshotChars: number;
	profiles: number;
	presets: number;
	draftChars: number;
	/** From `navigator.storage.estimate()`; null where unsupported. */
	usage: number | null;
	quota: number | null;
};

export async function getStorageSummary(): Promise<StorageSummary> {
	const [keyval, snapshotEntries, estimate] = await Promise.all([
		readKeyval().catch(() => ({}) as Record<string, unknown>),
		readEntries(SNAPSHOTS_STORE).catch(() => [] as [IDBValidKey, unknown][]),
		typeof navigator !== "undefined" && navigator.storage?.estimate
			? navigator.storage.estimate().catch(() => null)
			: Promise.resolve(null),
	]);
	const snapshots = snapshotEntries.map(([, value]) => value).filter(isSnapshot);
	const profiles = keyval[PROFILES_KEY];
	const presets = keyval[SELECTION_PRESETS_KEY];
	const draft = keyval[RAW_JSON_KEY];
	return {
		snapshots: snapshots.length,
		snapshotChars: snapshots.reduce((sum, snap) => sum + snap.size, 0),
		profiles: Array.isArray(profiles) ? profiles.filter(isProfile).length : 0,
		presets: Array.isArray(presets) ? presets.filter(isPreset).length : 0,
		draftChars: typeof draft === "string" ? draft.length : 0,
		usage: estimate?.usage ?? null,
		quota: estimate?.quota ?? null,
	};
}
