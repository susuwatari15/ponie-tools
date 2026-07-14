import {
	classifyWriteError,
	idbDelete,
	idbGet,
	idbPut,
	KEYVAL_STORE,
	PROFILES_KEY,
	SELECTED_PROFILE_KEY,
} from "./indexedDb";

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

export type ProfileWriteError = "quota" | "unknown";

/** Profiles are stored as a single ordered array under one keyval entry. */
export async function listProfiles(): Promise<SwaggerProfile[]> {
	try {
		const stored = await idbGet<unknown>(KEYVAL_STORE, PROFILES_KEY);
		if (!Array.isArray(stored)) return [];
		return stored.filter(isProfile);
	} catch {
		return [];
	}
}

async function writeAll(profiles: SwaggerProfile[]): Promise<void> {
	await idbPut(KEYVAL_STORE, profiles, PROFILES_KEY);
}

export async function addProfile(input: {
	name: string;
	color: string;
	url: string;
	username: string;
	password: string;
}): Promise<
	| { ok: true; profile: SwaggerProfile }
	| { ok: false; error: ProfileWriteError }
> {
	const profile: SwaggerProfile = {
		id: crypto.randomUUID(),
		name: input.name.trim(),
		color: input.color,
		url: input.url.trim(),
		username: input.username,
		password: input.password,
	};

	const next = [...(await listProfiles()), profile];
	try {
		await writeAll(next);
		return { ok: true, profile };
	} catch (e: unknown) {
		return { ok: false, error: classifyWriteError(e) };
	}
}

export async function updateProfile(
	id: string,
	patch: Partial<Omit<SwaggerProfile, "id">>,
): Promise<
	| { ok: true; profile: SwaggerProfile }
	| { ok: false; error: ProfileWriteError | "not-found" }
> {
	const profiles = await listProfiles();
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
		await writeAll(next);
		return { ok: true, profile: updated };
	} catch (e: unknown) {
		return { ok: false, error: classifyWriteError(e) };
	}
}

export async function removeProfile(id: string): Promise<void> {
	const next = (await listProfiles()).filter((p) => p.id !== id);
	try {
		await writeAll(next);
	} catch {
		// ignore
	}
}

export async function getProfile(id: string): Promise<SwaggerProfile | undefined> {
	return (await listProfiles()).find((p) => p.id === id);
}

export async function readSelectedProfileId(): Promise<string | null> {
	try {
		const value = await idbGet<string>(KEYVAL_STORE, SELECTED_PROFILE_KEY);
		return typeof value === "string" ? value : null;
	} catch {
		return null;
	}
}

export async function writeSelectedProfileId(id: string | null): Promise<void> {
	try {
		if (id) {
			await idbPut(KEYVAL_STORE, id, SELECTED_PROFILE_KEY);
		} else {
			await idbDelete(KEYVAL_STORE, SELECTED_PROFILE_KEY);
		}
	} catch {
		// storage unavailable
	}
}
