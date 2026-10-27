import {
	classifyWriteError,
	idbGet,
	idbPut,
	KEYVAL_STORE,
	SELECTION_PRESETS_KEY,
	type StorageWriteError,
} from "./indexedDb";

/** A named endpoint selection the minifier can re-apply after a spec update. */
export type SelectionPreset = {
	id: string;
	name: string;
	/** Spec identity the preset was saved from — used to list matching presets first. */
	specKey?: string;
	profileId?: string;
	endpointIds: string[];
	createdAt: number;
};

export function isPreset(item: unknown): item is SelectionPreset {
	return (
		typeof item === "object" &&
		item !== null &&
		typeof (item as SelectionPreset).id === "string" &&
		typeof (item as SelectionPreset).name === "string" &&
		Array.isArray((item as SelectionPreset).endpointIds) &&
		typeof (item as SelectionPreset).createdAt === "number"
	);
}

/** Presets are stored as a single ordered array under one keyval entry. */
export async function listPresets(): Promise<SelectionPreset[]> {
	try {
		const stored = await idbGet<unknown>(KEYVAL_STORE, SELECTION_PRESETS_KEY);
		if (!Array.isArray(stored)) return [];
		return stored.filter(isPreset);
	} catch {
		return [];
	}
}

export async function addPreset(
	input: Omit<SelectionPreset, "id" | "createdAt">,
): Promise<
	| { ok: true; preset: SelectionPreset }
	| { ok: false; error: StorageWriteError }
> {
	const preset: SelectionPreset = {
		...input,
		name: input.name.trim(),
		id: crypto.randomUUID(),
		createdAt: Date.now(),
	};

	try {
		await idbPut(KEYVAL_STORE, [...(await listPresets()), preset], SELECTION_PRESETS_KEY);
		return { ok: true, preset };
	} catch (e: unknown) {
		return { ok: false, error: classifyWriteError(e) };
	}
}

export async function removePreset(id: string): Promise<void> {
	const next = (await listPresets()).filter((preset) => preset.id !== id);
	try {
		await idbPut(KEYVAL_STORE, next, SELECTION_PRESETS_KEY);
	} catch {
		// ignore
	}
}
