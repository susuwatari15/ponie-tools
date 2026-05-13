/** Primary key for persisted light/dark preference. */
export const APP_THEME_STORAGE_KEY = "swagger-shorter-theme";

/** Legacy key from permission-diff; migrated once on read. */
export const LEGACY_THEME_STORAGE_KEY = "permission-diff-theme";

export type ResolvedTheme = "light" | "dark";

export function readStoredResolvedTheme(): ResolvedTheme {
	if (typeof window === "undefined") return "dark";

	const primary = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
	if (primary === "light" || primary === "dark") return primary;

	const legacy = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
	if (legacy === "light" || legacy === "dark") {
		window.localStorage.setItem(APP_THEME_STORAGE_KEY, legacy);
		window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
		return legacy;
	}

	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
