import type { ChangeEvent } from "react";
import {
	useDeferredValue,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { EndpointItem, HttpMethod } from "@/types/openapi";
import {
	buildEndpointIndex,
	fetchSwaggerFromUrl,
	minifySwagger,
} from "@/lib/swaggerMinifier";
import { filterEndpointsByQuery } from "@/lib/endpointFilter";
import { parseOpenApiInput } from "@/lib/openApiInput";
import { readStoredRawJson } from "@/lib/swaggerRawJsonStorage";
import { formatSwaggerEndpointsShort } from "@/lib/swaggerShortFormat";
import {
	fetchSwaggerViaExtension,
	isExtensionAvailable,
} from "@/lib/swaggerExtensionBridge";
import {
	addProfile,
	listProfiles,
	readSelectedProfileId,
	removeProfile,
	type SwaggerProfile,
	updateProfile,
	writeSelectedProfileId,
} from "@/lib/swaggerProfilesStorage";

export type SwaggerMinifierCopyFormat = "full" | "short" | "minified";

export function useSwaggerMinifier(initialJson: string) {
	const [rawJson, setRawJson] = useState(() => {
		const stored = readStoredRawJson();
		if (stored !== null) return stored;
		return initialJson;
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedMethods, setSelectedMethods] = useState<HttpMethod[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [copied, setCopied] = useState(false);
	const [inputMode, setInputMode] = useState<"manual" | "url">(() =>
		readSelectedProfileId() ? "url" : "manual",
	);
	const [isFetchingUrl, setIsFetchingUrl] = useState(false);
	const [urlFetchError, setUrlFetchError] = useState("");
	const [extensionAvailable, setExtensionAvailable] = useState(false);

	const [profiles, setProfiles] = useState<SwaggerProfile[]>(() => listProfiles());
	const [selectedProfileId, setSelectedProfileId] = useState<string | null>(() =>
		readSelectedProfileId(),
	);

	const selectedProfile = useMemo(
		() => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
		[profiles, selectedProfileId],
	);

	useEffect(() => {
		writeSelectedProfileId(selectedProfileId);
	}, [selectedProfileId]);

	useEffect(() => {
		let cancelled = false;
		const probe = async () => {
			const available = await isExtensionAvailable();
			if (!cancelled) setExtensionAvailable(available);
		};
		probe();
		window.addEventListener("focus", probe);
		return () => {
			cancelled = true;
			window.removeEventListener("focus", probe);
		};
	}, []);

	const selectProfile = (id: string | null) => {
		setSelectedProfileId(id);
	};

	const createProfile = (input: {
		name: string;
		color: string;
		url: string;
		username: string;
		password: string;
	}) => {
		const result = addProfile(input);
		if (result.ok) {
			setProfiles(listProfiles());
			setSelectedProfileId(result.profile.id);
		}
		return result;
	};

	const editProfile = (
		id: string,
		patch: Partial<Omit<SwaggerProfile, "id">>,
	) => {
		const result = updateProfile(id, patch);
		if (result.ok) {
			setProfiles(listProfiles());
		}
		return result;
	};

	const deleteProfile = (id: string) => {
		removeProfile(id);
		setProfiles(listProfiles());
		setSelectedProfileId((previous) => (previous === id ? null : previous));
	};

	const deferredRawJson = useDeferredValue(rawJson);
	const deferredSearchQuery = useDeferredValue(searchQuery);
	const deferredSelectedMethods = useDeferredValue(selectedMethods);

	const parsed = useMemo(
		() => parseOpenApiInput(deferredRawJson),
		[deferredRawJson],
	);

	const allEndpoints = useMemo<EndpointItem[]>(() => {
		if (!parsed.doc) return [];
		return buildEndpointIndex(parsed.doc);
	}, [parsed.doc]);

	const filteredEndpoints = useMemo(
		() => filterEndpointsByQuery(allEndpoints, deferredSearchQuery, deferredSelectedMethods),
		[allEndpoints, deferredSearchQuery, deferredSelectedMethods],
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

	const minifiedOutput = useMemo(() => {
		if (!parsed.doc || parsed.error || selectedIds.size === 0) return "";
		return minifySwagger(Array.from(selectedIds), parsed.doc);
	}, [parsed.doc, parsed.error, selectedIds]);

	const minifiedOutputShort = useMemo(() => {
		if (!parsed.doc || parsed.error || selectedIds.size === 0) return "";
		return formatSwaggerEndpointsShort(parsed.doc, Array.from(selectedIds));
	}, [parsed.doc, parsed.error, selectedIds]);

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
				: format === "short"
					? minifiedOutputShort
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

	const onFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const text = await file.text();
		setRawJson(text);
		event.target.value = "";
	};

	const onFetchFromUrl = async () => {
		if (!selectedProfile || !selectedProfile.url.trim()) {
			setUrlFetchError("Select a profile with a Swagger URL first.");
			return;
		}

		setUrlFetchError("");
		setIsFetchingUrl(true);

		try {
			if (extensionAvailable) {
				const result = await fetchSwaggerViaExtension(
					selectedProfile.url,
					selectedProfile.username,
					selectedProfile.password,
				);
				if (result.ok) {
					setRawJson(JSON.stringify(JSON.parse(result.data), null, 2));
				} else if (result.code === "NOT_AUTHENTICATED") {
					setUrlFetchError(
						"Not logged in to the API domain. Use \"Open in browser\" to log in, then retry.",
					);
				} else if (
					result.code === "URL_NOT_ALLOWED" ||
					result.code === "BRIDGE_ERROR" ||
					result.code === "TIMEOUT"
				) {
					const fetchedJson = await fetchSwaggerFromUrl(
						selectedProfile.url,
						selectedProfile.username,
						selectedProfile.password,
					);
					setRawJson(fetchedJson);
				} else {
					console.error("Error fetching swagger via extension:", result);
					setUrlFetchError(result.message);
				}
			} else {
				const fetchedJson = await fetchSwaggerFromUrl(
					selectedProfile.url,
					selectedProfile.username,
					selectedProfile.password,
				);
				setRawJson(fetchedJson);
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to fetch swagger from URL.";
			console.error("Error fetching swagger from URL:", error);
			setUrlFetchError(message);
		} finally {
			setIsFetchingUrl(false);
		}
	};

	return {
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
		profiles,
		selectedProfile,
		selectProfile,
		createProfile,
		editProfile,
		deleteProfile,
		parsed,
		allEndpoints,
		filteredEndpoints,
		minifiedOutput,
		minifiedOutputShort,
		selectedCount,
		visibleAllSelected,
		toggleSelection,
		toggleSelectAllVisible,
		onCopyFormat,
		onFileUpload,
		onFetchFromUrl,
	};
}

export type SwaggerMinifierController = ReturnType<typeof useSwaggerMinifier>;
