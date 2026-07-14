import {
	classifyWriteError,
	idbDelete,
	idbGet,
	idbGetAll,
	idbPut,
	SNAPSHOTS_STORE,
} from "./indexedDb";

export type SavedSnapshot = {
	id: string;
	name: string;
	createdAt: string;
	rawJson: string;
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
		typeof (item as SavedSnapshot).rawJson === "string"
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
		rawJson: input.rawJson,
		...(input.profileName ? { profileName: input.profileName } : {}),
		...(input.profileColor ? { profileColor: input.profileColor } : {}),
	};

	try {
		await idbPut(SNAPSHOTS_STORE, snapshot);
		return { ok: true, snapshot };
	} catch (e: unknown) {
		return { ok: false, error: classifyWriteError(e) };
	}
}

export async function removeSnapshot(id: string): Promise<void> {
	try {
		await idbDelete(SNAPSHOTS_STORE, id);
	} catch {
		// ignore
	}
}

export async function getSnapshot(id: string): Promise<SavedSnapshot | undefined> {
	try {
		const snapshot = await idbGet<SavedSnapshot>(SNAPSHOTS_STORE, id);
		return snapshot && isSnapshot(snapshot) ? snapshot : undefined;
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
