/** Where one side of a comparison reads its spec from. */
export type CompareSourceKind = "snapshot" | "profile" | "paste" | "minifier";

/** One side's picker state. Every kind's input is kept, so switching back and forth is lossless. */
export type CompareSide = {
	kind: CompareSourceKind;
	snapshotId: string;
	profileId: string;
	pasteText: string;
	/** Name of the uploaded file, when the pasted text came from one. */
	pasteName: string;
};

export type SideKey = "a" | "b";

/** A side read for a comparison: the spec text plus what the export and "save as snapshot" need. */
export type ResolvedSide = {
	kind: CompareSourceKind;
	label: string;
	rawJson: string;
	/** ISO date of the spec: the snapshot's save time, or when it was fetched / read. */
	date?: string;
	snapshotId?: string;
	profileName?: string;
	profileColor?: string;
	/** Default name when this side is saved as a snapshot. */
	snapshotName: string;
};

export const SOURCE_KINDS: { value: CompareSourceKind; label: string; title: string }[] = [
	{ value: "snapshot", label: "Snapshot", title: "A snapshot saved in this browser" },
	{ value: "profile", label: "Live", title: "Fetch a profile's Swagger URL when comparing" },
	{ value: "paste", label: "Paste", title: "Paste or upload an OpenAPI JSON file" },
	{ value: "minifier", label: "Minifier", title: "The spec currently loaded in the Minifier" },
];

export const SOURCE_KIND_LABEL: Record<CompareSourceKind, string> = {
	snapshot: "snapshot",
	profile: "live fetch",
	paste: "pasted JSON",
	minifier: "minifier input",
};

export function createSide(patch: Partial<CompareSide> = {}): CompareSide {
	return {
		kind: "snapshot",
		snapshotId: "",
		profileId: "",
		pasteText: "",
		pasteName: "",
		...patch,
	};
}

const PROFILE_PREFIX = "profile:";

/** `?a=` value → side: a snapshot id, `minifier`, or `profile:<id>`. Pasted text isn't linkable. */
export function parseSideParam(value: string | null): CompareSide {
	if (!value) return createSide();
	if (value === "minifier") return createSide({ kind: "minifier" });
	if (value.startsWith(PROFILE_PREFIX)) {
		return createSide({ kind: "profile", profileId: value.slice(PROFILE_PREFIX.length) });
	}
	return createSide({ snapshotId: value });
}

export function sideParam(side: CompareSide): string | null {
	switch (side.kind) {
		case "snapshot":
			return side.snapshotId || null;
		case "profile":
			return side.profileId ? `${PROFILE_PREFIX}${side.profileId}` : null;
		case "minifier":
			return "minifier";
		case "paste":
			return null;
	}
}

/** The side has enough input to be read (the read itself may still fail). */
export function isSideReady(side: CompareSide): boolean {
	switch (side.kind) {
		case "snapshot":
			return Boolean(side.snapshotId);
		case "profile":
			return Boolean(side.profileId);
		case "paste":
			return Boolean(side.pasteText.trim());
		case "minifier":
			return true;
	}
}
