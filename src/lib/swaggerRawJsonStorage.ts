export const RAW_JSON_STORAGE_KEY = "swagger-minifier-raw-json";

export function readStoredRawJson(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return localStorage.getItem(RAW_JSON_STORAGE_KEY);
	} catch {
		return null;
	}
}

export function writeRawJsonToStorage(rawJson: string): void {
	localStorage.setItem(RAW_JSON_STORAGE_KEY, rawJson);
}
