import { idbGet, idbPut, KEYVAL_STORE, MINIFIER_SELECTIONS_KEY } from "./indexedDb";

/** Endpoint ids selected in the minifier, keyed by spec identity (see `specKey`). */
export type StoredSelections = Record<string, string[]>;

/** Oldest specs are dropped past this many, so the entry can't grow forever. */
const MAX_STORED_SPECS = 50;

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export async function readStoredSelections(): Promise<StoredSelections> {
	try {
		const stored = await idbGet<unknown>(KEYVAL_STORE, MINIFIER_SELECTIONS_KEY);
		if (!stored || typeof stored !== "object") return {};
		return Object.fromEntries(
			Object.entries(stored).filter(([, ids]) => isStringArray(ids)),
		) as StoredSelections;
	} catch {
		return {};
	}
}

export async function writeStoredSelections(selections: StoredSelections): Promise<void> {
	try {
		await idbPut(KEYVAL_STORE, selections, MINIFIER_SELECTIONS_KEY);
	} catch {
		// storage unavailable
	}
}

/**
 * Returns `selections` with `specKey` set to `ids`, moved to the most-recent
 * end. An empty selection removes the key.
 */
export function withSelection(
	selections: StoredSelections,
	specKey: string,
	ids: string[],
): StoredSelections {
	const entries = Object.entries(selections).filter(([key]) => key !== specKey);
	if (ids.length === 0) return Object.fromEntries(entries);
	entries.push([specKey, ids]);
	return Object.fromEntries(entries.slice(-MAX_STORED_SPECS));
}
