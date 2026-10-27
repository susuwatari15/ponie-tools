import type { ChangeEvent } from "react";
import {
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { EndpointItem, HttpMethod, OpenApiDocument } from "@/types/openapi";
import { DEFAULT_MINIFY_OPTIONS, type MinifyOptions } from "@/lib/swaggerMinifier";
import {
	type EndpointGroupMode,
	filterEndpointsByQuery,
	groupEndpoints,
} from "@/lib/endpointFilter";
import { hashString } from "@/lib/hashString";
import {
	collectOpenApiDiagnostics,
	EMPTY_DIAGNOSTICS_REPORT,
} from "@/lib/openApiDiagnostics";
import { parseOpenApiInput } from "@/lib/openApiInput";
import { readStoredRawJson, writeRawJsonToStorage } from "@/lib/swaggerRawJsonStorage";
import {
	DEFAULT_MINIFIER_PREFS,
	readMinifierPrefs,
	writeMinifierPrefs,
} from "@/lib/swaggerMinifierPrefsStorage";
import {
	addPreset,
	listPresets,
	removePreset,
	type SelectionPreset,
} from "@/lib/swaggerPresetsStorage";
import {
	readStoredSelections,
	type StoredSelections,
	withSelection,
	writeStoredSelections,
} from "@/lib/swaggerSelectionStorage";
import { decodeSelection, encodeSelection } from "@/lib/selectionShareCode";
import { useOpenApiWorker } from "@/lib/openApiWorkerClient";
import {
	indexOpenApiDoc,
	type MinifiedOutput,
	minifyOpenApiDoc,
	shouldRunOffThread,
} from "@/lib/openApiWorkerTasks";
import type { SizeEstimate } from "@/lib/tokenEstimate";
import { useExtensionStatus } from "@/components/layout/ExtensionStatusProvider";
import { fetchSwaggerForProfile } from "@/lib/swaggerFetch";
import {
	addProfile,
	listProfiles,
	type ProfileInput,
	readSelectedProfileId,
	removeProfile,
	setSessionPassword,
	type SwaggerProfile,
	updateProfile,
	writeSelectedProfileId,
} from "@/lib/swaggerProfilesStorage";

export type SwaggerMinifierCopyFormat = "full" | "minified";

/** State carried by a `/minifier?p=&sel=` link, read once on mount. */
export type SwaggerMinifierSharedLink = {
	profileId: string | null;
	selectionCode: string | null;
	/** `&fetch=1` (command bar → Profiles): load the profile's spec once it is selected. */
	autoFetch?: boolean;
};

export type PresetApplyMode = "replace" | "merge";

/** Debounce for persisting the pasted spec, which can be several MB. */
const RAW_JSON_WRITE_DELAY_MS = 400;

/**
 * The endpoint index of one parsed spec. `rawJson` is set when the spec is
 * large enough to live in the worker, and is the text minify requests send.
 */
type SpecIndex = {
	doc: OpenApiDocument | null;
	endpoints: EndpointItem[];
	fullSpecSize: SizeEstimate | null;
	rawJson: string | null;
};

const EMPTY_INDEX: SpecIndex = { doc: null, endpoints: [], fullSpecSize: null, rawJson: null };

/** A worker minify result and the inputs it was built from. */
type WorkerMinified = {
	index: SpecIndex;
	selectedIds: Set<string>;
	options: MinifyOptions;
	result: MinifiedOutput | null;
};

/**
 * Identity used to remember a selection across reloads: profile + spec title
 * when the spec came from a profile (survives version bumps), else title +
 * version. The title keeps a profile switch from pairing the new profile with
 * the still-loaded previous spec.
 */
function buildSpecKey(
	doc: OpenApiDocument | null,
	profileId: string | null,
): string | null {
	if (!doc) return null;
	const title = doc.info?.title ?? "";
	if (profileId) return `profile:${profileId}:${hashString(title)}`;
	return `spec:${hashString(`${title}\n${doc.info?.version ?? ""}`)}`;
}

export function useSwaggerMinifier(
	initialJson: string,
	sharedLink?: SwaggerMinifierSharedLink,
) {
	const [rawJson, setRawJson] = useState(initialJson);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedMethods, setSelectedMethods] = useState<HttpMethod[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [copied, setCopied] = useState(false);
	const [inputMode, setInputMode] = useState<"manual" | "url">("manual");
	const [isFetchingUrl, setIsFetchingUrl] = useState(false);
	const [urlFetchError, setUrlFetchError] = useState("");
	const extension = useExtensionStatus();
	const extensionAvailable = extension.available;
	/** Profile to fetch once hydrated and the extension probe has answered. */
	const [autoFetchProfileId, setAutoFetchProfileId] = useState<string | null>(null);

	const [profiles, setProfiles] = useState<SwaggerProfile[]>([]);
	const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
	const [pendingProfileUrl, setPendingProfileUrl] = useState<string | null>(null);

	const [groupMode, setGroupMode] = useState<EndpointGroupMode>(
		DEFAULT_MINIFIER_PREFS.groupMode,
	);
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
	const [minifyOptions, setMinifyOptions] = useState<MinifyOptions>(DEFAULT_MINIFY_OPTIONS);
	const [presets, setPresets] = useState<SelectionPreset[]>([]);

	// IndexedDB reads are async, so persisted state is hydrated after mount
	// rather than in the useState initializers. Nothing is written back until
	// this flips, otherwise the initial defaults would overwrite stored values.
	const [isHydrated, setIsHydrated] = useState(false);

	const storedSelectionsRef = useRef<StoredSelections>({});
	/** Spec key whose stored selection has been applied (or checked) already. */
	const appliedSpecKeyRef = useRef<string | null>(null);
	/** Selection from a shared link, held until a spec containing it is loaded. */
	const pendingSharedSelectionRef = useRef<string[] | null>(null);
	const [sharedSelectionPending, setSharedSelectionPending] = useState(0);
	const sharedLinkRef = useRef(sharedLink);

	const selectedProfile = useMemo(
		() => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
		[profiles, selectedProfileId],
	);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const shared = sharedLinkRef.current;
			const [
				storedRawJson,
				storedProfiles,
				storedSelectedId,
				prefs,
				selections,
				storedPresets,
				sharedIds,
			] = await Promise.all([
				readStoredRawJson(),
				listProfiles(),
				readSelectedProfileId(),
				readMinifierPrefs(),
				readStoredSelections(),
				listPresets(),
				shared?.selectionCode ? decodeSelection(shared.selectionCode) : null,
			]);
			if (cancelled) return;

			// Profile ids are local to this browser, so a shared one only applies
			// when it exists here.
			const sharedProfileId =
				shared?.profileId && storedProfiles.some((p) => p.id === shared.profileId)
					? shared.profileId
					: null;
			const profileId = sharedProfileId ?? storedSelectedId;

			if (storedRawJson !== null) setRawJson(storedRawJson);
			setProfiles(storedProfiles);
			setSelectedProfileId(profileId);
			if (profileId) setInputMode("url");
			setGroupMode(prefs.groupMode);
			setCollapsedGroups(new Set(prefs.collapsedGroups));
			setMinifyOptions(prefs.minifyOptions);
			setPresets(storedPresets);
			if (shared?.autoFetch && sharedProfileId) setAutoFetchProfileId(sharedProfileId);
			storedSelectionsRef.current = selections;
			if (sharedIds && sharedIds.length > 0) {
				pendingSharedSelectionRef.current = sharedIds;
				setSharedSelectionPending(sharedIds.length);
			}
			setIsHydrated(true);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!isHydrated) return;
		void writeSelectedProfileId(selectedProfileId);
	}, [selectedProfileId, isHydrated]);

	useEffect(() => {
		if (!isHydrated) return;
		void writeMinifierPrefs({
			groupMode,
			collapsedGroups: Array.from(collapsedGroups),
			minifyOptions,
		});
	}, [groupMode, collapsedGroups, minifyOptions, isHydrated]);

	useEffect(() => {
		if (!isHydrated) return;
		const timer = window.setTimeout(
			() => void writeRawJsonToStorage(rawJson),
			RAW_JSON_WRITE_DELAY_MS,
		);
		return () => window.clearTimeout(timer);
	}, [rawJson, isHydrated]);

	const selectProfile = (id: string | null) => {
		setSelectedProfileId(id);
	};

	const createProfile = async (input: ProfileInput) => {
		const result = await addProfile(input);
		if (result.ok) {
			setProfiles(await listProfiles());
			setSelectedProfileId(result.profile.id);
		}
		return result;
	};

	const editProfile = async (
		id: string,
		patch: Partial<Omit<SwaggerProfile, "id">>,
	) => {
		const result = await updateProfile(id, patch);
		if (result.ok) {
			setProfiles(await listProfiles());
		}
		return result;
	};

	const setProfileSessionPassword = async (id: string, password: string) => {
		setSessionPassword(id, password);
		setProfiles(await listProfiles());
	};

	const deleteProfile = async (id: string) => {
		await removeProfile(id);
		setProfiles(await listProfiles());
		setSelectedProfileId((previous) => (previous === id ? null : previous));
	};

	const deferredRawJson = useDeferredValue(rawJson);
	const deferredSearchQuery = useDeferredValue(searchQuery);
	const deferredSelectedMethods = useDeferredValue(selectedMethods);

	const parsed = useMemo(
		() => parseOpenApiInput(deferredRawJson),
		[deferredRawJson],
	);

	const worker = useOpenApiWorker();

	// Small specs are indexed inline; large ones in the worker (`null` here).
	const syncIndex = useMemo<SpecIndex | null>(() => {
		if (!parsed.doc) return EMPTY_INDEX;
		if (shouldRunOffThread(deferredRawJson.length)) return null;
		return { doc: parsed.doc, rawJson: null, ...indexOpenApiDoc(parsed.doc) };
	}, [parsed.doc, deferredRawJson]);

	const [workerIndex, setWorkerIndex] = useState<SpecIndex>(EMPTY_INDEX);

	useEffect(() => {
		if (syncIndex || !parsed.doc) return;
		const doc = parsed.doc;
		const rawJson = deferredRawJson;
		worker
			.run("index", { rawJson })
			.then((result) => {
				if (result) setWorkerIndex({ doc, rawJson, ...result });
			})
			.catch(() => setWorkerIndex({ doc, rawJson: null, ...indexOpenApiDoc(doc) }));
	}, [syncIndex, parsed.doc, deferredRawJson, worker]);

	// While a large spec is being indexed the previous index stays, so the
	// endpoint list, spec key and selection all switch to the new spec together.
	const [lastIndex, setLastIndex] = useState<SpecIndex>(EMPTY_INDEX);
	const readyIndex = syncIndex ?? (workerIndex.doc === parsed.doc ? workerIndex : null);
	if (readyIndex && readyIndex !== lastIndex) setLastIndex(readyIndex);
	const index = readyIndex ?? lastIndex;
	const isIndexing = readyIndex === null;
	const allEndpoints = index.endpoints;

	const diagnostics = useMemo(
		() =>
			parsed.doc
				? collectOpenApiDiagnostics(parsed.doc, deferredRawJson)
				: EMPTY_DIAGNOSTICS_REPORT,
		[parsed.doc, deferredRawJson],
	);

	const filteredEndpoints = useMemo(
		() => filterEndpointsByQuery(allEndpoints, deferredSearchQuery, deferredSelectedMethods),
		[allEndpoints, deferredSearchQuery, deferredSelectedMethods],
	);

	const endpointGroups = useMemo(
		() => groupEndpoints(filteredEndpoints, groupMode),
		[filteredEndpoints, groupMode],
	);

	const specKey = useMemo(
		() => buildSpecKey(index.doc, inputMode === "url" ? selectedProfileId : null),
		[index.doc, inputMode, selectedProfileId],
	);

	useEffect(() => {
		setSelectedIds((previous) => {
			if (previous.size === 0) return previous;

			const validIds = new Set(allEndpoints.map((item) => item.id));
			const next = new Set<string>();
			for (const id of previous) {
				if (validIds.has(id)) next.add(id);
			}
			return next;
		});
	}, [allEndpoints]);

	// Declared before the restore effect below: in the commit where the spec
	// changes, this sees the previous key as not yet applied and skips, so the
	// outgoing selection is never written under the incoming spec's key.
	useEffect(() => {
		if (!isHydrated || !specKey || appliedSpecKeyRef.current !== specKey) return;
		storedSelectionsRef.current = withSelection(
			storedSelectionsRef.current,
			specKey,
			Array.from(selectedIds),
		);
		void writeStoredSelections(storedSelectionsRef.current);
	}, [selectedIds, specKey, isHydrated]);

	// When a spec is loaded, restore its remembered selection. A pending shared
	// link wins, but only once it matches the loaded spec. With nothing stored
	// the current (pruned) selection carries over, e.g. across a version bump.
	useEffect(() => {
		if (!isHydrated || !specKey || allEndpoints.length === 0) return;
		const validIds = new Set(allEndpoints.map((item) => item.id));

		const shared = pendingSharedSelectionRef.current;
		if (shared) {
			const matched = shared.filter((id) => validIds.has(id));
			if (matched.length > 0) {
				pendingSharedSelectionRef.current = null;
				setSharedSelectionPending(0);
				appliedSpecKeyRef.current = specKey;
				setSelectedIds(new Set(matched));
				return;
			}
		}

		if (appliedSpecKeyRef.current === specKey) return;
		appliedSpecKeyRef.current = specKey;
		const stored = storedSelectionsRef.current[specKey];
		if (stored && stored.length > 0) {
			setSelectedIds(new Set(stored.filter((id) => validIds.has(id))));
		}
	}, [allEndpoints, specKey, isHydrated]);

	const syncMinified = useMemo(() => {
		if (!index.doc || index.rawJson !== null || selectedIds.size === 0) return null;
		return minifyOpenApiDoc(index.doc, Array.from(selectedIds), minifyOptions);
	}, [index, selectedIds, minifyOptions]);

	const [workerMinified, setWorkerMinified] = useState<WorkerMinified | null>(null);

	useEffect(() => {
		if (index.rawJson === null || selectedIds.size === 0) return;
		const request = { index, selectedIds, options: minifyOptions };
		worker
			.run("minify", {
				rawJson: index.rawJson,
				endpointIds: Array.from(selectedIds),
				options: minifyOptions,
			})
			.then((result) => {
				if (result) setWorkerMinified({ ...request, result });
			})
			.catch(() => setWorkerMinified({ ...request, result: null }));
	}, [index, selectedIds, minifyOptions, worker]);

	// A worker result is shown until the next one lands, rather than blanking the output.
	const usesWorker = index.rawJson !== null && selectedIds.size > 0;
	const minified = usesWorker ? (workerMinified?.result ?? null) : syncMinified;
	const isMinifying =
		usesWorker &&
		(workerMinified?.index !== index ||
			workerMinified.selectedIds !== selectedIds ||
			workerMinified.options !== minifyOptions);

	const minifiedOutput = minified?.output ?? "";
	/** Single-line JSON — what "Copy Minified" puts on the clipboard. */
	const minifiedCompact = minified?.compact ?? "";
	const outputSize = minified?.size ?? null;
	// Measured compact too, so it compares like-for-like with the output.
	const fullSpecSize = index.fullSpecSize;

	const selectedCount = selectedIds.size;
	const visibleAllSelected =
		filteredEndpoints.length > 0 &&
		filteredEndpoints.every((endpoint) => selectedIds.has(endpoint.id));

	const toggleSelection = (id: string) => {
		setSelectedIds((previous) => {
			const next = new Set(previous);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleSelectAllVisible = () => {
		setSelectedIds((previous) => {
			const next = new Set(previous);
			const visibleIds = filteredEndpoints.map((item) => item.id);
			const shouldUnselect = visibleIds.every((id) => next.has(id));

			if (shouldUnselect) {
				for (const id of visibleIds) {
					next.delete(id);
				}
			} else {
				for (const id of visibleIds) {
					next.add(id);
				}
			}

			return next;
		});
	};

	const setEndpointsSelected = (ids: string[], selected: boolean) => {
		setSelectedIds((previous) => {
			const next = new Set(previous);
			for (const id of ids) {
				if (selected) next.add(id);
				else next.delete(id);
			}
			return next;
		});
	};

	const toggleGroupCollapsed = (key: string) => {
		setCollapsedGroups((previous) => {
			const next = new Set(previous);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const setGroupCollapsed = (key: string, collapsed: boolean) => {
		setCollapsedGroups((previous) => {
			if (previous.has(key) === collapsed) return previous;
			const next = new Set(previous);
			if (collapsed) next.add(key);
			else next.delete(key);
			return next;
		});
	};

	const savePreset = async (name: string) => {
		const result = await addPreset({
			name,
			specKey: specKey ?? undefined,
			profileId: inputMode === "url" ? (selectedProfileId ?? undefined) : undefined,
			endpointIds: Array.from(selectedIds),
		});
		if (result.ok) setPresets(await listPresets());
		return result;
	};

	const applyPreset = (preset: SelectionPreset, mode: PresetApplyMode) => {
		const validIds = new Set(allEndpoints.map((item) => item.id));
		const found = preset.endpointIds.filter((id) => validIds.has(id));
		setSelectedIds((previous) =>
			mode === "merge" ? new Set([...previous, ...found]) : new Set(found),
		);
		return { found: found.length, total: preset.endpointIds.length };
	};

	const deletePreset = async (id: string) => {
		await removePreset(id);
		setPresets(await listPresets());
	};

	/** How many of each preset's endpoints exist in the loaded spec. */
	const presetMatches = useMemo(() => {
		const validIds = new Set(allEndpoints.map((item) => item.id));
		return new Map(
			presets.map((preset) => [
				preset.id,
				preset.endpointIds.filter((id) => validIds.has(id)).length,
			]),
		);
	}, [presets, allEndpoints]);

	const dismissSharedSelection = () => {
		pendingSharedSelectionRef.current = null;
		setSharedSelectionPending(0);
	};

	const buildShareLink = async () => {
		const url = new URL("/minifier", window.location.origin);
		if (inputMode === "url" && selectedProfileId) url.searchParams.set("p", selectedProfileId);
		if (selectedIds.size > 0) {
			url.searchParams.set("sel", await encodeSelection(Array.from(selectedIds)));
		}
		return url.toString();
	};

	const toggleMethod = (method: HttpMethod) => {
		setSelectedMethods((previous) =>
			previous.includes(method)
				? previous.filter((m) => m !== method)
				: [...previous, method]
		);
	};

	const onCopyFormat = async (format: SwaggerMinifierCopyFormat) => {
		const text =
			format === "full"
				? minifiedOutput
				: (() => {
					try {
						return JSON.stringify(JSON.parse(minifiedOutput));
					} catch {
						return minifiedOutput;
					}
				})();
		if (!text) return;

		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			setCopied(false);
		}
	};

	const loadFile = async (file: File) => {
		setRawJson(await file.text());
	};

	const onFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		await loadFile(file);
		event.target.value = "";
	};

	/**
	 * A pasted Swagger URL switches to URL mode: it selects the profile that
	 * already points there, or asks the profile form to start a new one.
	 */
	const openPastedUrl = (url: string): SwaggerProfile | null => {
		setInputMode("url");
		const match = profiles.find((profile) => profile.url.trim() === url) ?? null;
		if (match) setSelectedProfileId(match.id);
		else setPendingProfileUrl(url);
		return match;
	};

	const clearPendingProfileUrl = () => setPendingProfileUrl(null);

	const fetchProfile = async (profile: SwaggerProfile | null) => {
		if (!profile || !profile.url.trim()) {
			setUrlFetchError("Select a profile with a Swagger URL first.");
			return;
		}

		setUrlFetchError("");
		setIsFetchingUrl(true);
		const result = await fetchSwaggerForProfile(profile, extensionAvailable);
		if (result.ok) setRawJson(result.rawJson);
		else setUrlFetchError(result.error);
		setIsFetchingUrl(false);
	};

	const onFetchFromUrl = () => fetchProfile(selectedProfile);

	/** Command bar: switch to URL mode on `id` and load its spec. */
	const selectAndFetchProfile = (id: string) => {
		const profile = profiles.find((item) => item.id === id) ?? null;
		setInputMode("url");
		setSelectedProfileId(id);
		void fetchProfile(profile);
	};

	useEffect(() => {
		if (!autoFetchProfileId || extension.status === "checking") return;
		if (selectedProfile?.id !== autoFetchProfileId) return;
		setAutoFetchProfileId(null);
		// fetchProfile is recreated every render (not a dep); the guards make this run once.
		void fetchProfile(selectedProfile);
	}, [autoFetchProfileId, extension.status, selectedProfile]);

	return {
		/** False until persisted state has been read from IndexedDB. */
		isHydrated,
		rawJson,
		setRawJson,
		searchQuery,
		setSearchQuery,
		selectedMethods,
		toggleMethod,
		selectedIds,
		copied,
		inputMode,
		setInputMode,
		isFetchingUrl,
		urlFetchError,
		extensionAvailable,
		extensionHosts: extension.info?.hosts ?? null,
		profiles,
		selectedProfile,
		selectProfile,
		createProfile,
		editProfile,
		deleteProfile,
		setProfileSessionPassword,
		selectAndFetchProfile,
		pendingProfileUrl,
		clearPendingProfileUrl,
		parsed,
		diagnostics,
		/** A large spec is being indexed in the worker; the previous index is still shown. */
		isIndexing,
		allEndpoints,
		filteredEndpoints,
		endpointGroups,
		groupMode,
		setGroupMode,
		collapsedGroups,
		toggleGroupCollapsed,
		setGroupCollapsed,
		minifyOptions,
		setMinifyOptions,
		minifiedOutput,
		minifiedCompact,
		/** The worker is building output for the current selection; the last output is still shown. */
		isMinifying,
		outputSize,
		fullSpecSize,
		selectedCount,
		visibleAllSelected,
		toggleSelection,
		toggleSelectAllVisible,
		setEndpointsSelected,
		presets,
		presetMatches,
		savePreset,
		applyPreset,
		deletePreset,
		specKey,
		sharedSelectionPending,
		dismissSharedSelection,
		buildShareLink,
		onCopyFormat,
		loadFile,
		onFileUpload,
		openPastedUrl,
		onFetchFromUrl,
	};
}

export type SwaggerMinifierController = ReturnType<typeof useSwaggerMinifier>;
