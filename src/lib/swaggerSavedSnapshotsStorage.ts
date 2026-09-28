import {
	classifyWriteError,
	idbGet,
	idbGetAll,
	idbWrite,
	SNAPSHOT_JSON_STORE,
	SNAPSHOTS_STORE,
} from "./indexedDb";

/** A saved snapshot's metadata. The spec text is fetched separately with `getSnapshotJson`. */
export type SavedSnapshot = {
	id: string;
	name: string;
	createdAt: string;
	/** Length of the stored spec text, in characters. */
	size: number;
	profileName?: string;
	profileColor?: string;
};

function isSnapshot(item: unknown): item is SavedSnapshot {
	return (
		typeof item === "object" &&
		item !== null &&
		typeof (item as SavedSnapshot).id === "string" &&
		typeof (item as SavedSnapshot).name === "string" &&
		typeof (item as SavedSnapshot).createdAt === "string" &&
		typeof (item as SavedSnapshot).size === "number"
	);
}

/** Oldest first (by createdAt), preserving the legacy insertion order. */
export async function listSnapshots(): Promise<SavedSnapshot[]> {
	try {
		const all = (await idbGetAll<SavedSnapshot>(SNAPSHOTS_STORE)).filter(isSnapshot);
		return all.sort(
			(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
		);
	} catch {
		return [];
	}
}

export type AddSnapshotError = "quota" | "unknown";

export async function addSnapshot(input: {
	name: string;
	rawJson: string;
	profileName?: string;
	profileColor?: string;
}): Promise<{ ok: true; snapshot: SavedSnapshot } | { ok: false; error: AddSnapshotError }> {
	const snapshot: SavedSnapshot = {
		id: crypto.randomUUID(),
		name: input.name.trim(),
		createdAt: new Date().toISOString(),
		size: input.rawJson.length,
		...(input.profileName ? { profileName: input.profileName } : {}),
		...(input.profileColor ? { profileColor: input.profileColor } : {}),
	};

	try {
		await idbWrite([SNAPSHOTS_STORE, SNAPSHOT_JSON_STORE], (tx) => {
			tx.objectStore(SNAPSHOTS_STORE).put(snapshot);
			tx.objectStore(SNAPSHOT_JSON_STORE).put(input.rawJson, snapshot.id);
		});
		return { ok: true, snapshot };
	} catch (e: unknown) {
		return { ok: false, error: classifyWriteError(e) };
	}
}

export async function removeSnapshot(id: string): Promise<void> {
	try {
		await idbWrite([SNAPSHOTS_STORE, SNAPSHOT_JSON_STORE], (tx) => {
			tx.objectStore(SNAPSHOTS_STORE).delete(id);
			tx.objectStore(SNAPSHOT_JSON_STORE).delete(id);
		});
	} catch {
		// ignore
	}
}

/** The snapshot's full spec text, or undefined when it can't be read. */
export async function getSnapshotJson(id: string): Promise<string | undefined> {
	try {
		const rawJson = await idbGet<unknown>(SNAPSHOT_JSON_STORE, id);
		return typeof rawJson === "string" ? rawJson : undefined;
	} catch {
		return undefined;
	}
}

/** Newest snapshot first. Returns baseline (older) and latest (newer) ids for compare. */
export async function getLatestTwoSnapshotIdsForCompare(): Promise<
	{ versionA: string; versionB: string } | null
> {
	const sorted = (await listSnapshots()).slice().sort((a, b) => {
		const tb = new Date(b.createdAt).getTime();
		const ta = new Date(a.createdAt).getTime();
		return tb - ta;
	});
	if (sorted.length < 2) return null;
	return { versionA: sorted[1].id, versionB: sorted[0].id };
}
