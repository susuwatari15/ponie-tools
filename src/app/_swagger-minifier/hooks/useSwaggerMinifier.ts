import type { ChangeEvent } from "react";
import {
	useDeferredValue,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { EndpointItem } from "@/types/openapi";
import {
	buildEndpointIndex,
	fetchSwaggerFromUrl,
	minifySwagger,
} from "@/lib/swaggerMinifier";
import { filterEndpointsByQuery } from "@/lib/endpointFilter";
import { parseOpenApiInput } from "@/lib/openApiInput";
import { readStoredRawJson } from "@/lib/swaggerRawJsonStorage";
import { readStoredSwaggerUrlConfig, writeSwaggerUrlConfigToStorage } from "@/lib/swaggerUrlStorage";
import { formatSwaggerEndpointsShort, type SwaggerCopyFormat } from "@/lib/swaggerShortFormat";

export function useSwaggerMinifier(initialJson: string) {
	const [rawJson, setRawJson] = useState(() => {
		const stored = readStoredRawJson();
		if (stored !== null) return stored;
		return initialJson;
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [copied, setCopied] = useState(false);
	const [inputMode, setInputMode] = useState<"manual" | "url">(() => {
		const stored = readStoredSwaggerUrlConfig();
		return stored?.url ? "url" : "manual";
	});
	const [swaggerUrl, setSwaggerUrl] = useState(() => {
		const stored = readStoredSwaggerUrlConfig();
		return stored?.url ?? "";
	});
	const [username, setUsername] = useState(() => {
		const stored = readStoredSwaggerUrlConfig();
		return stored?.username ?? "";
	});
	const [password, setPassword] = useState(() => {
		const stored = readStoredSwaggerUrlConfig();
		return stored?.password ?? "";
	});
	const [isFetchingUrl, setIsFetchingUrl] = useState(false);
	const [urlFetchError, setUrlFetchError] = useState("");

	useEffect(() => {
		writeSwaggerUrlConfigToStorage({ url: swaggerUrl, username, password });
	}, [swaggerUrl, username, password]);

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

	const onCopyFormat = async (format: SwaggerCopyFormat) => {
		const text = format === "full" ? minifiedOutput : minifiedOutputShort;
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
