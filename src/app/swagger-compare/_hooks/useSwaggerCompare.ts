import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { downloadTextFile, toFileSlug } from "@/lib/downloadFile";
import {
	buildEndpointsClipboardText,
	compareOpenApiRawJson,
	type OpenApiCompareOk,
	type OpenApiCompareResult,
	type SwaggerCopyFormat,
} from "@/lib/openApiCompare";
import { isExtensionAvailable } from "@/lib/swaggerExtensionBridge";
import { fetchSwaggerForProfile } from "@/lib/swaggerFetch";
import { listProfiles, type SwaggerProfile } from "@/lib/swaggerProfilesStorage";
import { readStoredRawJson, writeRawJsonToStorage } from "@/lib/swaggerRawJsonStorage";
import {
	addSnapshot,
	getSnapshotJson,
	listSnapshots,
	removeSnapshots,
	type SavedSnapshot,
	updateSnapshot,
} from "@/lib/swaggerSavedSnapshotsStorage";
import type { HttpMethod } from "@/types/openapi";
import {
	applyCompareFilters,
	type CompareFilters,
	DEFAULT_FILTERS,
	describeFilters,
	isFiltering,
	resultMethods,
	resultTags,
	STATUS_ORDER,
	writeFilterParams,
} from "../_lib/compareFilters";
import {
	type CompareSide,
	isSideReady,
	type ResolvedSide,
	type SideKey,
	sideParam,
	SOURCE_KIND_LABEL,
} from "../_lib/compareSources";
import type { CompareStatus } from "../_lib/compareTree";
import { exportFileName, type ExportOptions, toJson, toMarkdown } from "../_lib/exportDiff";
import type { FocusRequest } from "./useCompareResultsView";

export type StorageEstimate = { usage: number; quota: number };

type UseSwaggerCompareInit = {
	sideA: CompareSide;
	sideB: CompareSide;
	filters: CompareFilters;
};

/** Resolves after the browser has painted, so a busy state shows before heavy sync work. */
const afterPaint = () =>
	new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

const timestamp = () => format(new Date(), "yyyy-MM-dd HH:mm:ss");

type ResolveOutcome = { ok: true; side: ResolvedSide } | { ok: false; error: string };

const toggleIn = <T>(list: T[], value: T): T[] =>
	list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

export function useSwaggerCompare(init: UseSwaggerCompareInit) {
	const router = useRouter();
	const { toast } = useToast();

	const [snapshots, setSnapshots] = useState<SavedSnapshot[]>([]);
	const [profiles, setProfiles] = useState<SwaggerProfile[]>([]);
	const [extensionAvailable, setExtensionAvailable] = useState(false);
	/** Size of the Minifier's current spec text; null when it has none. */
	const [minifierSize, setMinifierSize] = useState<number | null>(null);
	const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);

	const [sideA, setSideA] = useState(init.sideA);
	const [sideB, setSideB] = useState(init.sideB);
	const [filters, setFilters] = useState(init.filters);

	const [compareResult, setCompareResult] = useState<OpenApiCompareResult | null>(null);
	/** The two sides behind the current result — what exports and "save as snapshot" read. */
	const [resolved, setResolved] = useState<Record<SideKey, ResolvedSide> | null>(null);
	const [comparing, setComparing] = useState(false);
	const [focus, setFocus] = useState<FocusRequest | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	/** Bumped on every compare/reset so a stale in-flight compare is dropped. */
	const compareRun = useRef(0);

	const refreshStorageEstimate = useCallback(() => {
		if (typeof navigator === "undefined" || !navigator.storage?.estimate) return;
		void navigator.storage
			.estimate()
			.then(({ usage, quota }) => {
				if (quota) setStorageEstimate({ usage: usage ?? 0, quota });
			})
			.catch(() => setStorageEstimate(null));
	}, []);

	const refreshSnapshots = useCallback(async () => {
		const list = await listSnapshots();
		setSnapshots(list);
		refreshStorageEstimate();
		return list;
	}, [refreshStorageEstimate]);

	// Profiles, the Minifier's draft and the extension can all change in another
	// tab, so they are re-read whenever the window regains focus.
	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			const [list, storedProfiles, rawJson, available] = await Promise.all([
				listSnapshots(),
				listProfiles(),
				readStoredRawJson(),
				isExtensionAvailable(),
			]);
			if (cancelled) return;
			setSnapshots(list);
			setProfiles(storedProfiles);
			setMinifierSize(rawJson?.trim() ? rawJson.length : null);
			setExtensionAvailable(available);
			refreshStorageEstimate();
		};
		void load();
		window.addEventListener("focus", load);
		return () => {
			cancelled = true;
			window.removeEventListener("focus", load);
		};
	}, [refreshStorageEstimate]);

	// Keep the address bar shareable: linkable sources plus the active filters.
	useEffect(() => {
		const params = new URLSearchParams();
		const a = sideParam(sideA);
		const b = sideParam(sideB);
		if (a) params.set("a", a);
		if (b) params.set("b", b);
		writeFilterParams(params, filters);
		const query = params.toString();
		const next = `${window.location.pathname}${query ? `?${query}` : ""}`;
		if (next !== `${window.location.pathname}${window.location.search}`) {
			window.history.replaceState(null, "", next);
		}
	}, [sideA, sideB, filters]);

	const resetResult = () => {
		compareRun.current += 1;
		setComparing(false);
		setCompareResult(null);
		setResolved(null);
		setFocus(null);
		setSelectedIds(new Set());
	};

	// ---- Sources -------------------------------------------------------------

	const sides: Record<SideKey, CompareSide> = { a: sideA, b: sideB };
	const setSide = (key: SideKey, side: CompareSide) => (key === "a" ? setSideA : setSideB)(side);

	/** Any input change makes the current result stale. */
	const updateSide = (key: SideKey, patch: Partial<CompareSide>) => {
		const next = { ...sides[key], ...patch };
		setSide(key, next);
		resetResult();
		// The same snapshot can't be on both sides.
		const otherKey: SideKey = key === "a" ? "b" : "a";
		const other = sides[otherKey];
		if (
			next.kind === "snapshot" &&
			other.kind === "snapshot" &&
			next.snapshotId &&
			next.snapshotId === other.snapshotId
		) {
			setSide(otherKey, { ...other, snapshotId: "" });
		}
	};

	const selectSnapshotAs = (key: SideKey, snapshotId: string) =>
		updateSide(key, { kind: "snapshot", snapshotId });

	const resolveSide = async (side: CompareSide, key: SideKey): Promise<ResolveOutcome> => {
		switch (side.kind) {
			case "snapshot": {
				const snap = snapshots.find((s) => s.id === side.snapshotId);
				if (!snap) return { ok: false, error: "Snapshot not found. Refresh the list." };
				const rawJson = await getSnapshotJson(snap.id);
				if (rawJson === undefined) {
					return { ok: false, error: "Couldn't read the snapshot from browser storage." };
				}
				return {
					ok: true,
					side: {
						kind: "snapshot",
						label: snap.name,
						rawJson,
						date: snap.createdAt,
						snapshotId: snap.id,
						profileName: snap.profileName,
						profileColor: snap.profileColor,
						snapshotName: snap.name,
					},
				};
			}
			case "profile": {
				const profile = profiles.find((p) => p.id === side.profileId);
				if (!profile) return { ok: false, error: "Profile not found. Pick another one." };
				const result = await fetchSwaggerForProfile(profile, extensionAvailable);
				if (!result.ok) return result;
				return {
					ok: true,
					side: {
						kind: "profile",
						label: `${profile.name} (live)`,
						rawJson: result.rawJson,
						date: new Date().toISOString(),
						profileName: profile.name,
						profileColor: profile.color,
						snapshotName: `${profile.name} - ${timestamp()}`,
					},
				};
			}
			case "paste": {
				const rawJson = side.pasteText.trim();
				if (!rawJson) return { ok: false, error: "Paste or upload a spec first." };
				const label = side.pasteName || `Pasted ${key.toUpperCase()}`;
				return {
					ok: true,
					side: { kind: "paste", label, rawJson, snapshotName: `${label} - ${timestamp()}` },
				};
			}
			case "minifier": {
				const rawJson = await readStoredRawJson();
				setMinifierSize(rawJson?.trim() ? rawJson.length : null);
				if (!rawJson?.trim()) return { ok: false, error: "The Minifier has no spec loaded." };
				return {
					ok: true,
					side: {
						kind: "minifier",
						label: "Minifier input",
						rawJson,
						date: new Date().toISOString(),
						snapshotName: `Minifier - ${timestamp()}`,
					},
				};
			}
		}
	};

	const canCompare =
		isSideReady(sideA) &&
		isSideReady(sideB) &&
		!(sideA.kind === "snapshot" && sideB.kind === "snapshot" && sideA.snapshotId === sideB.snapshotId);

	/** Compares the given sides — defaults to the current pickers. */
	const compare = async (a: CompareSide = sideA, b: CompareSide = sideB) => {
		resetResult();
		if (!isSideReady(a) || !isSideReady(b)) {
			setCompareResult({ ok: false, error: "Pick a source for both A and B." });
			return;
		}
		if (a.kind === "snapshot" && b.kind === "snapshot" && a.snapshotId === b.snapshotId) {
			setCompareResult({ ok: false, error: "Pick two different snapshots." });
			return;
		}

		const run = compareRun.current;
		setComparing(true);
		const [outA, outB] = await Promise.all([resolveSide(a, "a"), resolveSide(b, "b")]);
		await afterPaint();
		if (run !== compareRun.current) return;

		setComparing(false);
		if (!outA.ok) {
			setCompareResult({ ok: false, error: outA.error, side: "a" });
			return;
		}
		if (!outB.ok) {
			setCompareResult({ ok: false, error: outB.error, side: "b" });
			return;
		}

		const result = compareOpenApiRawJson(outA.side.rawJson, outB.side.rawJson, {
			labelA: outA.side.label,
			labelB: outB.side.label,
		});
		setCompareResult(result);
		setResolved(result.ok ? { a: outA.side, b: outB.side } : null);
		setSelectedIds(
			result.ok
				? new Set([...result.added.map((i) => i.id), ...result.changed.map((i) => i.id)])
				: new Set(),
		);
	};

	/** Stores a live / pasted side of the current result and points the picker at the new snapshot. */
	const saveSideAsSnapshot = async (key: SideKey) => {
		const side = resolved?.[key];
		if (!side || side.kind === "snapshot") return;
		const result = await addSnapshot({
			name: side.snapshotName,
			rawJson: side.rawJson,
			profileName: side.profileName,
			profileColor: side.profileColor,
		});
		if (!result.ok) {
			toast(
				result.error === "quota"
					? "Browser storage is full. Remove old snapshots or use a smaller spec."
					: "Could not save snapshot.",
				"error",
			);
			return;
		}
		await refreshSnapshots();
		// Same spec text, so the current result stays valid.
		setSide(key, { ...sides[key], kind: "snapshot", snapshotId: result.snapshot.id });
		setResolved((prev) =>
			prev
				? {
						...prev,
						[key]: { ...prev[key], kind: "snapshot", snapshotId: result.snapshot.id },
					}
				: prev,
		);
		toast(`Saved “${result.snapshot.name}”`, "success");
	};

	// ---- Snapshot library -----------------------------------------------------

	const renameSnapshot = async (id: string, name: string) => {
		const trimmed = name.trim();
		if (!trimmed) return;
		const ok = await updateSnapshot(id, { name: trimmed });
		await refreshSnapshots();
		toast(ok ? "Snapshot renamed" : "Couldn't rename that snapshot", ok ? "success" : "error");
	};

	const deleteSnapshots = async (ids: string[]) => {
		if (ids.length === 0) return;
		await removeSnapshots(ids);
		await refreshSnapshots();
		const gone = new Set(ids);
		let touched = false;
		for (const key of ["a", "b"] as const) {
			const side = sides[key];
			if (side.kind === "snapshot" && gone.has(side.snapshotId)) {
				setSide(key, { ...side, snapshotId: "" });
				touched = true;
			}
		}
		if (touched) resetResult();
		toast(ids.length === 1 ? "Snapshot deleted" : `${ids.length} snapshots deleted`, "success");
	};

	const loadIntoMinifier = async (snap: SavedSnapshot) => {
		const rawJson = await getSnapshotJson(snap.id);
		if (rawJson === undefined) {
			toast("Couldn't read that snapshot", "error");
			return;
		}
		await writeRawJsonToStorage(rawJson);
		router.push("/minifier");
	};

	const downloadSnapshot = async (snap: SavedSnapshot) => {
		const rawJson = await getSnapshotJson(snap.id);
		if (rawJson === undefined) {
			toast("Couldn't read that snapshot", "error");
			return;
		}
		downloadTextFile(`${toFileSlug(snap.name, "snapshot")}.json`, rawJson, "application/json");
	};

	/** `snapshots` is newest first. */
	const latestSnapshot = snapshots[0] ?? null;

	const compareWithLatest = (snap: SavedSnapshot) => {
		if (!latestSnapshot || latestSnapshot.id === snap.id) return;
		const a = { ...sideA, kind: "snapshot" as const, snapshotId: snap.id };
		const b = { ...sideB, kind: "snapshot" as const, snapshotId: latestSnapshot.id };
		setSideA(a);
		setSideB(b);
		void compare(a, b);
	};

	// ---- Filters ---------------------------------------------------------------

	const okResult: OpenApiCompareOk | null = compareResult?.ok ? compareResult : null;

	const filteredResult = useMemo(
		() => (okResult ? applyCompareFilters(okResult, filters) : null),
		[okResult, filters],
	);

	/** Per-status counts under every filter except the status one. */
	const statusCounts = useMemo<Record<CompareStatus, number> | null>(() => {
		if (!okResult) return null;
		const r = applyCompareFilters(okResult, { ...filters, statuses: STATUS_ORDER });
		return { added: r.added.length, removed: r.removed.length, changed: r.changed.length };
	}, [okResult, filters]);

	const availableMethods = useMemo(() => (okResult ? resultMethods(okResult) : []), [okResult]);
	const availableTags = useMemo(() => (okResult ? resultTags(okResult) : []), [okResult]);
	const docsOnlyCount = okResult?.changed.filter((row) => row.docsOnly).length ?? 0;
	const filtering = isFiltering(filters);

	const filterActions = {
		toggleStatus: (status: CompareStatus) =>
			setFilters((prev) => ({
				...prev,
				statuses: STATUS_ORDER.filter((s) => (s === status) !== prev.statuses.includes(s)),
			})),
		toggleMethod: (method: HttpMethod) =>
			setFilters((prev) => ({ ...prev, methods: toggleIn(prev.methods, method) })),
		toggleTag: (tag: string) => setFilters((prev) => ({ ...prev, tags: toggleIn(prev.tags, tag) })),
		clearTags: () => setFilters((prev) => ({ ...prev, tags: [] })),
		setQuery: (query: string) => setFilters((prev) => ({ ...prev, query })),
		setIgnoreDocsOnly: (ignoreDocsOnly: boolean) =>
			setFilters((prev) => ({ ...prev, ignoreDocsOnly })),
		reset: () => setFilters(DEFAULT_FILTERS),
	};

	// ---- Selection & copy -------------------------------------------------------

	/** Shown endpoints that exist in B — the only ones that can be copied. */
	const selectableIds = useMemo(
		() =>
			filteredResult
				? [...filteredResult.added.map((i) => i.id), ...filteredResult.changed.map((i) => i.id)]
				: [],
		[filteredResult],
	);

	const setEndpointsSelected = (ids: string[], selected: boolean) =>
		setSelectedIds((prev) => {
			const next = new Set(prev);
			for (const id of ids) {
				if (selected) next.add(id);
				else next.delete(id);
			}
			return next;
		});

	const toggleEndpoint = (id: string) => setEndpointsSelected([id], !selectedIds.has(id));

	/** Ticked endpoints that the filters still show, in diff order (added, then changed). */
	const selectedShownIds = selectableIds.filter((id) => selectedIds.has(id));
	const canCopySelected = selectedShownIds.length > 0 && resolved !== null;

	const copySelected = async (fmt: SwaggerCopyFormat) => {
		if (!resolved) return;
		const text = buildEndpointsClipboardText(resolved.b.rawJson, selectedShownIds, fmt);
		if (text === null) {
			toast("Nothing to copy", "error");
			return;
		}
		try {
			await navigator.clipboard.writeText(text);
			toast(
				`${selectedShownIds.length} endpoint${selectedShownIds.length === 1 ? "" : "s"} copied (${fmt})`,
				"success",
			);
		} catch {
			toast("Couldn't access the clipboard", "error");
		}
	};

	/** Jump to the result row for a path picked in the tree. */
	const focusEndpoint = (endpointId: string) =>
		setFocus((prev) => ({ endpointId, seq: (prev?.seq ?? 0) + 1 }));

	// ---- Export -------------------------------------------------------------------

	const exportOptions = (): ExportOptions | null =>
		resolved
			? {
					a: {
						label: resolved.a.label,
						date: resolved.a.date,
						source: SOURCE_KIND_LABEL[resolved.a.kind],
					},
					b: {
						label: resolved.b.label,
						date: resolved.b.date,
						source: SOURCE_KIND_LABEL[resolved.b.kind],
					},
					filters: describeFilters(filters),
				}
			: null;

	const exportDiff = async (target: "copy-md" | "download-md" | "download-json") => {
		const opts = exportOptions();
		if (!filteredResult || !opts) return;
		if (target === "download-json") {
			downloadTextFile(exportFileName(opts, "json"), toJson(filteredResult, opts), "application/json");
			return;
		}
		const markdown = toMarkdown(filteredResult, opts);
		if (target === "download-md") {
			downloadTextFile(exportFileName(opts, "md"), markdown, "text/markdown");
			return;
		}
		try {
			await navigator.clipboard.writeText(markdown);
			toast(filtering ? "Markdown copied (filtered view)" : "Markdown copied", "success");
		} catch {
			toast("Couldn't access the clipboard", "error");
		}
	};

	return {
		// sources
		snapshots,
		profiles,
		extensionAvailable,
		minifierSize,
		sideA,
		sideB,
		updateSide,
		selectSnapshotAs,
		canCompare,
		compare,
		comparing,
		resolved,
		saveSideAsSnapshot,
		// library
		latestSnapshot,
		storageEstimate,
		renameSnapshot,
		deleteSnapshots,
		loadIntoMinifier,
		downloadSnapshot,
		compareWithLatest,
		// result + filters
		compareResult,
		filteredResult,
		filters,
		filtering,
		filterActions,
		statusCounts,
		availableMethods,
		availableTags,
		docsOnlyCount,
		// selection
		focus,
		focusEndpoint,
		selectedIds,
		selectableIds,
		selectedShownIds,
		setEndpointsSelected,
		clearSelection: () => setSelectedIds(new Set()),
		toggleEndpoint,
		canCopySelected,
		copySelected,
		// export
		exportDiff,
	};
}

export type SwaggerCompareController = ReturnType<typeof useSwaggerCompare>;
