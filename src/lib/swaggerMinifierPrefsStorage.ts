import type { EndpointGroupMode } from "./endpointFilter";
import { idbGet, idbPut, KEYVAL_STORE, MINIFIER_PREFS_KEY } from "./indexedDb";
import { DEFAULT_MINIFY_OPTIONS, type MinifyOptions } from "./swaggerMinifier";

export type MinifierPrefs = {
	groupMode: EndpointGroupMode;
	collapsedGroups: string[];
	minifyOptions: MinifyOptions;
};

export const DEFAULT_MINIFIER_PREFS: MinifierPrefs = {
	groupMode: "tag",
	collapsedGroups: [],
	minifyOptions: DEFAULT_MINIFY_OPTIONS,
};

const GROUP_MODES: EndpointGroupMode[] = ["tag", "path", "none"];

function readMinifyOptions(value: unknown): MinifyOptions {
	if (!value || typeof value !== "object") return DEFAULT_MINIFY_OPTIONS;
	const stored = value as Record<string, unknown>;
	const options = { ...DEFAULT_MINIFY_OPTIONS };
	for (const key of Object.keys(options) as Array<keyof MinifyOptions>) {
		if (typeof stored[key] === "boolean") options[key] = stored[key];
	}
	return options;
}

/** Reads field by field so a partial or older record still restores what it can. */
export async function readMinifierPrefs(): Promise<MinifierPrefs> {
	try {
		const stored = await idbGet<Record<string, unknown>>(KEYVAL_STORE, MINIFIER_PREFS_KEY);
		if (!stored || typeof stored !== "object") return DEFAULT_MINIFIER_PREFS;
		return {
			groupMode: GROUP_MODES.includes(stored.groupMode as EndpointGroupMode)
				? (stored.groupMode as EndpointGroupMode)
				: DEFAULT_MINIFIER_PREFS.groupMode,
			collapsedGroups: Array.isArray(stored.collapsedGroups)
				? stored.collapsedGroups.filter((key): key is string => typeof key === "string")
				: [],
			minifyOptions: readMinifyOptions(stored.minifyOptions),
		};
	} catch {
		return DEFAULT_MINIFIER_PREFS;
	}
}

export async function writeMinifierPrefs(prefs: MinifierPrefs): Promise<void> {
	try {
		await idbPut(KEYVAL_STORE, prefs, MINIFIER_PREFS_KEY);
	} catch {
		// storage unavailable
	}
}
