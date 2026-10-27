/** Key for the persisted UI density — a per-viewer preference, stored like the theme. */
export const APP_DENSITY_STORAGE_KEY = "ponie-density";

export type Density = "compact" | "comfortable";

export const DEFAULT_DENSITY: Density = "comfortable";

export function isDensity(value: unknown): value is Density {
	return value === "compact" || value === "comfortable";
}

export function readStoredDensity(): Density {
	if (typeof window === "undefined") return DEFAULT_DENSITY;
	try {
		const stored = window.localStorage.getItem(APP_DENSITY_STORAGE_KEY);
		return isDensity(stored) ? stored : DEFAULT_DENSITY;
	} catch {
		return DEFAULT_DENSITY;
	}
}

export function writeStoredDensity(density: Density): void {
	try {
		window.localStorage.setItem(APP_DENSITY_STORAGE_KEY, density);
	} catch {
		// storage unavailable
	}
}
