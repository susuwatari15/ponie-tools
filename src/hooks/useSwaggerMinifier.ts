import type { ChangeEvent } from "react";
import {
	useDeferredValue,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { EndpointItem } from "../types/openapi";
import {
	buildEndpointIndex,
	fetchSwaggerFromUrl,
	minifySwagger,
} from "../utils/swaggerMinifier";
import { filterEndpointsByQuery } from "../utils/endpointFilter";
import { parseOpenApiInput } from "../utils/openApiInput";
import { readStoredRawJson } from "../utils/swaggerRawJsonStorage";

export function useSwaggerMinifier(initialJson: string) {
	const [rawJson, setRawJson] = useState(() => {
		const stored = readStoredRawJson();
		if (stored !== null) return stored;
		return initialJson;
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [copied, setCopied] = useState(false);
	const [inputMode, setInputMode] = useState<"manual" | "url">("manual");
	const [swaggerUrl, setSwaggerUrl] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isFetchingUrl, setIsFetchingUrl] = useState(false);
	const [urlFetchError, setUrlFetchError] = useState("");

	const deferredRawJson = useDeferredValue(rawJson);
	const deferredSearchQuery = useDeferredValue(searchQuery);

	const parsed = useMemo(
		() => parseOpenApiInput(deferredRawJson),
		[deferredRawJson],
	);

	const allEndpoints = useMemo<EndpointItem[]>(() => {
		if (!parsed.doc) return [];
		return buildEndpointIndex(parsed.doc);
	}, [parsed.doc]);

	const filteredEndpoints = useMemo(
		() => filterEndpointsByQuery(allEndpoints, deferredSearchQuery),
		[allEndpoints, deferredSearchQuery],
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

	const onCopy = async () => {
		if (!minifiedOutput) return;

		try {
			await navigator.clipboard.writeText(minifiedOutput);
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
		setUrlFetchError("");
		setIsFetchingUrl(true);

		try {
			const fetchedJson = await fetchSwaggerFromUrl(swaggerUrl, username, password);
			setRawJson(fetchedJson);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to fetch swagger from URL.";
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
		selectedIds,
		copied,
		inputMode,
		setInputMode,
		swaggerUrl,
		setSwaggerUrl,
		username,
		setUsername,
		password,
		setPassword,
		isFetchingUrl,
		urlFetchError,
		parsed,
		allEndpoints,
		filteredEndpoints,
		minifiedOutput,
		selectedCount,
		visibleAllSelected,
		toggleSelection,
		toggleSelectAllVisible,
		onCopy,
		onFileUpload,
		onFetchFromUrl,
	};
}

export type SwaggerMinifierController = ReturnType<typeof useSwaggerMinifier>;
