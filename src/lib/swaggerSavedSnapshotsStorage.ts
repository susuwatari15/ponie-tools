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

/** Newest first (by createdAt). */
export async function listSnapshots(): Promise<SavedSnapshot[]> {
	try {
		const all = (await idbGetAll<SavedSnapshot>(SNAPSHOTS_STORE)).filter(isSnapshot);
		return all.sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
	await removeSnapshots([id]);
}

/** Deletes several snapshots (metadata + spec text) in one transaction. */
export async function removeSnapshots(ids: string[]): Promise<void> {
	if (ids.length === 0) return;
	try {
		await idbWrite([SNAPSHOTS_STORE, SNAPSHOT_JSON_STORE], (tx) => {
			for (const id of ids) {
				tx.objectStore(SNAPSHOTS_STORE).delete(id);
				tx.objectStore(SNAPSHOT_JSON_STORE).delete(id);
			}
		});
	} catch {
		// ignore
	}
}

/** Patches a snapshot's metadata. Resolves false when it is missing or can't be written. */
export async function updateSnapshot(
	id: string,
	patch: { name?: string },
): Promise<boolean> {
	let found = false;
	try {
		await idbWrite([SNAPSHOTS_STORE], (tx) => {
			const store = tx.objectStore(SNAPSHOTS_STORE);
			const request = store.get(id);
			request.onsuccess = () => {
				if (!isSnapshot(request.result)) return;
				found = true;
				const next: SavedSnapshot = { ...request.result };
				if (patch.name !== undefined) next.name = patch.name.trim();
				store.put(next);
			};
		});
		return found;
	} catch {
		return false;
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

/** Returns baseline (older) and latest (newer) ids of the two newest snapshots. */
export async function getLatestTwoSnapshotIdsForCompare(): Promise<
	{ versionA: string; versionB: string } | null
> {
	const sorted = await listSnapshots();
	if (sorted.length < 2) return null;
	return { versionA: sorted[1].id, versionB: sorted[0].id };
}
