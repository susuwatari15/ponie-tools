export const SAVED_SNAPSHOTS_STORAGE_KEY = "swagger-minifier-saved-snapshots";

export type SavedSnapshot = {
	id: string;
	name: string;
	createdAt: string;
	rawJson: string;
};

function parseStored(raw: string | null): SavedSnapshot[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(item): item is SavedSnapshot =>
				typeof item === "object" &&
				item !== null &&
				typeof (item as SavedSnapshot).id === "string" &&
				typeof (item as SavedSnapshot).name === "string" &&
				typeof (item as SavedSnapshot).createdAt === "string" &&
				typeof (item as SavedSnapshot).rawJson === "string",
		);
	} catch {
		return [];
	}
}

export function listSnapshots(): SavedSnapshot[] {
	if (typeof window === "undefined") return [];
	try {
		return parseStored(localStorage.getItem(SAVED_SNAPSHOTS_STORAGE_KEY));
	} catch {
		return [];
	}
}

function writeAll(snapshots: SavedSnapshot[]): void {
	localStorage.setItem(SAVED_SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));
}

export type AddSnapshotError = "quota" | "unknown";

export function addSnapshot(input: {
	name: string;
	rawJson: string;
}): { ok: true; snapshot: SavedSnapshot } | { ok: false; error: AddSnapshotError } {
	const snapshot: SavedSnapshot = {
		id: crypto.randomUUID(),
		name: input.name.trim(),
		createdAt: new Date().toISOString(),
		rawJson: input.rawJson,
	};

	const next = [...listSnapshots(), snapshot];

	try {
		writeAll(next);
		return { ok: true, snapshot };
	} catch (e: unknown) {
		const name =
			typeof e === "object" && e !== null && "name" in e
				? String((e as { name?: string }).name)
				: "";
		if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
			return { ok: false, error: "quota" };
		}
		return { ok: false, error: "unknown" };
	}
}

export function removeSnapshot(id: string): void {
	const next = listSnapshots().filter((s) => s.id !== id);
	try {
		writeAll(next);
	} catch {
		// ignore
	}
}

export function getSnapshot(id: string): SavedSnapshot | undefined {
	return listSnapshots().find((s) => s.id === id);
}
