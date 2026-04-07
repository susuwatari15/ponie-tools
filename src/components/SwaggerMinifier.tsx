import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
	AlertTriangle,
	Check,
	Copy,
	Download,
	Save,
	Search,
	Upload,
} from "lucide-react";
import type {
	EndpointItem,
	OpenApiDocument,
	SwaggerMinifierProps,
} from "../types/openapi";
import {
	buildEndpointIndex,
	fetchSwaggerFromUrl,
	minifySwagger,
} from "../utils/swaggerMinifier";

const RAW_JSON_STORAGE_KEY = "swagger-minifier-raw-json";

function readStoredRawJson(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return localStorage.getItem(RAW_JSON_STORAGE_KEY);
	} catch {
		return null;
	}
}

const SwaggerMinifier: React.FC<SwaggerMinifierProps> = ({
	initialJson = "",
	className = "",
}) => {
	const [rawJson, setRawJson] = useState(() => {
		const stored = readStoredRawJson();
		if (stored !== null) return stored;
		return initialJson;
	});
	const [savedToStorage, setSavedToStorage] = useState(false);
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

	const parsed = useMemo(() => {
		const input = deferredRawJson.trim();
		if (!input) return { doc: null as OpenApiDocument | null, error: "" };

		try {
			const doc = JSON.parse(input) as OpenApiDocument;
			if (!doc.paths || typeof doc.paths !== "object") {
				return {
					doc: null,
					error: "Invalid OpenAPI/Swagger: missing `paths` object.",
				};
			}
			return { doc, error: "" };
		} catch {
			return {
				doc: null,
				error: "Invalid JSON. Please paste a valid swagger.json.",
			};
		}
	}, [deferredRawJson]);

	const allEndpoints = useMemo<EndpointItem[]>(() => {
		if (!parsed.doc) return [];
		return buildEndpointIndex(parsed.doc);
	}, [parsed.doc]);

	const filteredEndpoints = useMemo(() => {
		const q = deferredSearchQuery.trim().toLowerCase();
		if (!q) return allEndpoints;

		return allEndpoints.filter((item) => {
			const haystack =
				`${item.method} ${item.path} ${item.summary}`.toLowerCase();
			return haystack.includes(q);
		});
	}, [allEndpoints, deferredSearchQuery]);

	useEffect(() => {
		setSelectedIds((previous) => {
			if (previous.size === 0) return previous;

			const validIds = new Set(allEndpoints.map((item) => item.id));
			const next = new Set<string>();
			previous.forEach((id) => {
				if (validIds.has(id)) next.add(id);
			});
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
				visibleIds.forEach((id) => next.delete(id));
			} else {
				visibleIds.forEach((id) => next.add(id));
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

	const onFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const text = await file.text();
		setRawJson(text);
		event.target.value = "";
	};

	const onSaveToLocalStorage = () => {
		try {
			localStorage.setItem(RAW_JSON_STORAGE_KEY, rawJson);
			setSavedToStorage(true);
			window.setTimeout(() => setSavedToStorage(false), 1500);
		} catch {
			setSavedToStorage(false);
		}
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

	return (
		<div
			className={`w-full overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/80 text-slate-100 shadow-glow backdrop-blur ${className}`}
		>
			<div className="border-b border-slate-700/70 bg-slate-900/80 px-4 py-4 lg:px-6">
				<h1 className="text-lg font-semibold tracking-tight text-slate-100">
					Swagger Minifier
				</h1>
				<p className="mt-1 text-sm text-slate-400">
					Select only the endpoints you need and generate a compact,
					prompt-ready swagger view.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 lg:p-6">
				<section className="flex min-h-[640px] flex-col overflow-hidden rounded-xl border border-slate-700/70 bg-panel/75">
					<div className="border-b border-slate-700/70 p-3">
						<div className="mb-3 flex gap-2">
							<button
								type="button"
								onClick={() => setInputMode("manual")}
								className={`rounded-md border px-3 py-1.5 text-xs transition ${
									inputMode === "manual"
										? "border-accent/70 bg-accent/15 text-sky-200"
										: "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
								}`}
							>
								Paste / Upload
							</button>
							<button
								type="button"
								onClick={() => setInputMode("url")}
								className={`rounded-md border px-3 py-1.5 text-xs transition ${
									inputMode === "url"
										? "border-accent/70 bg-accent/15 text-sky-200"
										: "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
								}`}
							>
								Fetch from URL
							</button>
						</div>

						{inputMode === "manual" ? (
							<>
								<textarea
									value={rawJson}
									onChange={(event) => setRawJson(event.target.value)}
									placeholder="Paste swagger.json here..."
									className="h-36 w-full resize-none rounded-md border border-slate-700 bg-slate-950/90 p-3 font-mono text-xs text-slate-200 outline-none ring-0 transition focus:border-accent"
								/>

								<div className="mt-2 flex flex-wrap items-center gap-2">
									<label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 transition hover:border-slate-400">
										<Upload className="h-4 w-4" />
										Upload JSON
										<input
											type="file"
											accept="application/json,.json"
											onChange={onFileUpload}
											className="hidden"
										/>
									</label>
									<button
										type="button"
										onClick={onSaveToLocalStorage}
										className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 transition hover:border-slate-400"
									>
										{savedToStorage ? (
											<Check className="h-4 w-4 text-emerald-300" />
										) : (
											<Save className="h-4 w-4" />
										)}
										{savedToStorage ? "Saved" : "Save to browser"}
									</button>
								</div>
							</>
						) : (
							<div className="rounded-md border border-slate-700 bg-slate-900/60 p-2">
								<div className="grid grid-cols-1 gap-2">
									<input
										value={swaggerUrl}
										onChange={(event) => setSwaggerUrl(event.target.value)}
										placeholder="Swagger URL (https://...)"
										className="w-full rounded-md border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-accent"
									/>

									<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
										<input
											value={username}
											onChange={(event) => setUsername(event.target.value)}
											placeholder="Username"
											className="rounded-md border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-accent"
										/>
										<input
											value={password}
											onChange={(event) => setPassword(event.target.value)}
											placeholder="Password"
											type="password"
											className="rounded-md border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-accent"
										/>
										<button
											type="button"
											onClick={onFetchFromUrl}
											disabled={isFetchingUrl || !swaggerUrl.trim()}
											className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
										>
											<Download className="h-4 w-4" />
											{isFetchingUrl ? "Loading..." : "Load from URL"}
										</button>
									</div>
								</div>

								{urlFetchError ? (
									<p className="mt-2 text-xs text-rose-300">{urlFetchError}</p>
								) : null}
							</div>
						)}

						<div className="mt-2 flex flex-wrap items-center gap-2">
							{parsed.error ? (
								<span className="inline-flex items-center gap-1 text-xs text-rose-300">
									<AlertTriangle className="h-3.5 w-3.5" />
									{parsed.error}
								</span>
							) : parsed.doc ? (
								<span className="text-xs text-emerald-300">
									{allEndpoints.length} endpoints detected.
								</span>
							) : (
								<span className="text-xs text-slate-400">
									Paste JSON to start.
								</span>
							)}
						</div>
					</div>

					<div className="border-b border-slate-700/70 p-3">
						<div className="relative">
							<Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
							<input
								value={searchQuery}
								onChange={(event) => setSearchQuery(event.target.value)}
								placeholder="Search path, method, summary..."
								className="w-full rounded-md border border-slate-700 bg-slate-950/90 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none transition focus:border-accent"
							/>
						</div>

						<div className="mt-2 flex items-center justify-between text-xs text-slate-400">
							<span>
								{selectedCount} selected / {allEndpoints.length}
							</span>
							<button
								type="button"
								onClick={toggleSelectAllVisible}
								disabled={filteredEndpoints.length === 0}
								className="rounded px-2 py-1 text-sky-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600"
							>
								{visibleAllSelected ? "Unselect visible" : "Select visible"}
							</button>
						</div>
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto p-2 max-h-[40vh] lg:max-h-[50vh]">
						{filteredEndpoints.length === 0 ? (
							<div className="rounded-md border border-dashed border-slate-700 p-4 text-center text-sm text-slate-400">
								No matching endpoints.
							</div>
						) : (
							<ul className="space-y-1.5">
								{filteredEndpoints.map((endpoint) => {
									const checked = selectedIds.has(endpoint.id);
									return (
										<li key={endpoint.id}>
											<button
												type="button"
												onClick={() => toggleSelection(endpoint.id)}
												className={`w-full rounded-lg border px-3 py-2 text-left transition ${
													checked
														? "border-accent/70 bg-accent/10"
														: "border-slate-700 bg-slate-900/60 hover:border-slate-500"
												}`}
											>
												<div className="flex items-center justify-between gap-3">
													<span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-sky-300">
														{endpoint.method}
													</span>
													<input
														type="checkbox"
														checked={checked}
														onClick={(event) => event.stopPropagation()}
														onChange={() => toggleSelection(endpoint.id)}
														className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-accent focus:ring-accent"
													/>
												</div>
												<p className="mt-1 break-all font-mono text-xs text-slate-100">
													{endpoint.path}
												</p>
												{endpoint.summary ? (
													<p className="mt-1 text-xs text-slate-400">
														{endpoint.summary}
													</p>
												) : null}
											</button>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</section>

				<section className="flex min-h-[640px] flex-col overflow-hidden rounded-xl border border-slate-700/70 bg-panel/75">
					<div className="flex items-center justify-between border-b border-slate-700/70 p-3">
						<div>
							<h2 className="text-sm font-medium text-slate-100">
								Compressed Output
							</h2>
							<p className="text-xs text-slate-400">
								Path + method + summary + TS-style request/response schemas
							</p>
						</div>

						<button
							type="button"
							onClick={onCopy}
							disabled={!minifiedOutput}
							className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
						>
							{copied ? (
								<Check className="h-4 w-4 text-emerald-300" />
							) : (
								<Copy className="h-4 w-4" />
							)}
							{copied ? "Copied!" : "Copy"}
						</button>
					</div>

					<div className="h-[40vh] min-h-[300px] p-3 lg:h-[70vh]">
						<pre className="h-full overflow-auto rounded-md border border-slate-700 bg-slate-950/90 p-3 font-mono text-xs leading-6 text-slate-200">
							{parsed.error
								? "// Fix invalid JSON to generate output."
								: selectedCount === 0
									? "// Select one or more endpoints from the left pane."
									: minifiedOutput}
						</pre>
					</div>
				</section>
			</div>
		</div>
	);
};

export default SwaggerMinifier;
