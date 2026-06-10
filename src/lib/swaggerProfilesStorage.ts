export const SWAGGER_PROFILES_STORAGE_KEY = "swagger-minifier-profiles";
export const SWAGGER_SELECTED_PROFILE_STORAGE_KEY =
	"swagger-minifier-selected-profile";

export type SwaggerProfile = {
	id: string;
	name: string;
	color: string;
	url: string;
	username: string;
	password: string;
};

/** Preset palette for profile colors (hex). */
export const PROFILE_COLORS = [
	"#0ea5e9", // sky
	"#22c55e", // green
	"#f59e0b", // amber
	"#ef4444", // red
	"#a855f7", // purple
	"#ec4899", // pink
	"#14b8a6", // teal
	"#64748b", // slate
] as const;

export const DEFAULT_PROFILE_COLOR: string = PROFILE_COLORS[0];

function isProfile(item: unknown): item is SwaggerProfile {
	return (
		typeof item === "object" &&
		item !== null &&
		typeof (item as SwaggerProfile).id === "string" &&
		typeof (item as SwaggerProfile).name === "string" &&
		typeof (item as SwaggerProfile).color === "string" &&
		typeof (item as SwaggerProfile).url === "string" &&
		typeof (item as SwaggerProfile).username === "string" &&
		typeof (item as SwaggerProfile).password === "string"
	);
}

function parseStored(raw: string | null): SwaggerProfile[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isProfile);
	} catch {
		return [];
	}
}

export function listProfiles(): SwaggerProfile[] {
	if (typeof window === "undefined") return [];
	try {
		return parseStored(localStorage.getItem(SWAGGER_PROFILES_STORAGE_KEY));
	} catch {
		return [];
	}
}

function writeAll(profiles: SwaggerProfile[]): void {
	localStorage.setItem(SWAGGER_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

export type ProfileWriteError = "quota" | "unknown";

function classifyWriteError(e: unknown): ProfileWriteError {
	const name =
		typeof e === "object" && e !== null && "name" in e
			? String((e as { name?: string }).name)
			: "";
	if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
		return "quota";
	}
	return "unknown";
}

export function addProfile(input: {
	name: string;
	color: string;
	url: string;
	username: string;
	password: string;
}):
	| { ok: true; profile: SwaggerProfile }
	| { ok: false; error: ProfileWriteError } {
	const profile: SwaggerProfile = {
		id: crypto.randomUUID(),
		name: input.name.trim(),
		color: input.color,
		url: input.url.trim(),
		username: input.username,
		password: input.password,
	};

	const next = [...listProfiles(), profile];
	try {
		writeAll(next);
		return { ok: true, profile };
	} catch (e: unknown) {
		return { ok: false, error: classifyWriteError(e) };
	}
}

export function updateProfile(
	id: string,
	patch: Partial<Omit<SwaggerProfile, "id">>,
):
	| { ok: true; profile: SwaggerProfile }
	| { ok: false; error: ProfileWriteError | "not-found" } {
	const profiles = listProfiles();
	const index = profiles.findIndex((p) => p.id === id);
	if (index === -1) return { ok: false, error: "not-found" };

	const updated: SwaggerProfile = {
		...profiles[index],
		...patch,
		name: (patch.name ?? profiles[index].name).trim(),
		id,
	};
	const next = profiles.slice();
	next[index] = updated;

	try {
		writeAll(next);
		return { ok: true, profile: updated };
	} catch (e: unknown) {
		return { ok: false, error: classifyWriteError(e) };
	}
}

export function removeProfile(id: string): void {
	const next = listProfiles().filter((p) => p.id !== id);
	try {
		writeAll(next);
	} catch {
		// ignore
	}
}

export function getProfile(id: string): SwaggerProfile | undefined {
	return listProfiles().find((p) => p.id === id);
}

export function readSelectedProfileId(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return localStorage.getItem(SWAGGER_SELECTED_PROFILE_STORAGE_KEY);
	} catch {
		return null;
	}
}

export function writeSelectedProfileId(id: string | null): void {
	try {
		if (id) {
			localStorage.setItem(SWAGGER_SELECTED_PROFILE_STORAGE_KEY, id);
		} else {
			localStorage.removeItem(SWAGGER_SELECTED_PROFILE_STORAGE_KEY);
		}
	} catch {
		// storage full or unavailable
	}
}
