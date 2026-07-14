import { idbGet, idbPut, KEYVAL_STORE, RAW_JSON_KEY } from "./indexedDb";

export async function readStoredRawJson(): Promise<string | null> {
	try {
		const value = await idbGet<string>(KEYVAL_STORE, RAW_JSON_KEY);
		return typeof value === "string" ? value : null;
	} catch {
		return null;
	}
}

export async function writeRawJsonToStorage(rawJson: string): Promise<void> {
	try {
		await idbPut(KEYVAL_STORE, rawJson, RAW_JSON_KEY);
	} catch {
		// storage unavailable
	}
}
