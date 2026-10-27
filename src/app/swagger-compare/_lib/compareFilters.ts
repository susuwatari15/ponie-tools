import { HTTP_METHOD_ORDER } from "@/components/ui/methodColors";
import type { OpenApiCompareOk } from "@/lib/openApiCompare";
import { parseEndpointId } from "@/lib/swaggerMinifier";
import type { HttpMethod } from "@/types/openapi";
import type { CompareStatus } from "./compareTree";

export type CompareFilters = {
	/** Statuses shown; all three means no status filter. */
	statuses: CompareStatus[];
	/** Empty = every method. */
	methods: HttpMethod[];
	/** Empty = every tag; otherwise an endpoint needs at least one of them. */
	tags: string[];
	/** Case-insensitive match on method + path and summary. */
	query: string;
	/** Hide changes that only touch `summary` / `description` / `example(s)`. */
	ignoreDocsOnly: boolean;
};

export const STATUS_ORDER: CompareStatus[] = ["added", "removed", "changed"];

export const DEFAULT_FILTERS: CompareFilters = {
	statuses: STATUS_ORDER,
	methods: [],
	tags: [],
	query: "",
	ignoreDocsOnly: false,
};

export function isFiltering(filters: CompareFilters): boolean {
	return (
		filters.statuses.length < STATUS_ORDER.length ||
		filters.methods.length > 0 ||
		filters.tags.length > 0 ||
		filters.query.trim().length > 0 ||
		filters.ignoreDocsOnly
	);
}

const splitList = (value: string | null): string[] =>
	(value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);

/** Reads `?show=added,changed&m=get,post&tag=Users&q=…&docs=hide`. */
export function parseFilterParams(params: Pick<URLSearchParams, "get" | "getAll">): CompareFilters {
	const show = splitList(params.get("show")).filter((s): s is CompareStatus =>
		STATUS_ORDER.includes(s as CompareStatus),
	);
	const methods = splitList(params.get("m"))
		.map((m) => m.toLowerCase())
		.filter((m): m is HttpMethod => HTTP_METHOD_ORDER.includes(m as HttpMethod));
	return {
		statuses: show.length > 0 ? STATUS_ORDER.filter((s) => show.includes(s)) : STATUS_ORDER,
		methods,
		// Tags may contain commas, so each one is its own `tag=` param.
		tags: params.getAll("tag").filter(Boolean),
		query: params.get("q") ?? "",
		ignoreDocsOnly: params.get("docs") === "hide",
	};
}

export function writeFilterParams(params: URLSearchParams, filters: CompareFilters): void {
	if (filters.statuses.length < STATUS_ORDER.length) {
		params.set("show", filters.statuses.join(","));
	}
	if (filters.methods.length > 0) params.set("m", filters.methods.join(","));
	for (const tag of filters.tags) params.append("tag", tag);
	if (filters.query.trim()) params.set("q", filters.query.trim());
	if (filters.ignoreDocsOnly) params.set("docs", "hide");
}

/** The result narrowed to what the filters let through. Returns `result` itself when nothing is filtered. */
export function applyCompareFilters(
	result: OpenApiCompareOk,
	filters: CompareFilters,
): OpenApiCompareOk {
	if (!isFiltering(filters)) return result;

	const show = new Set(filters.statuses);
	const methods = new Set(filters.methods);
	const tags = new Set(filters.tags);
	const query = filters.query.trim().toLowerCase();

	const matches = (id: string, summary: string, endpointTags: string[]) => {
		if (methods.size > 0) {
			const method = parseEndpointId(id)?.method;
			if (!method || !methods.has(method)) return false;
		}
		if (tags.size > 0 && !endpointTags.some((tag) => tags.has(tag))) return false;
		if (query && !id.toLowerCase().includes(query) && !summary.toLowerCase().includes(query)) {
			return false;
		}
		return true;
	};

	const added = show.has("added")
		? result.added.filter((item) => matches(item.id, item.summary, item.tags))
		: [];
	const removed = show.has("removed")
		? result.removed.filter((item) => matches(item.id, item.summary, item.tags))
		: [];
	const changed = show.has("changed")
		? result.changed.filter(
				(row) =>
					!(filters.ignoreDocsOnly && row.docsOnly) &&
					matches(row.id, `${row.summaryA} ${row.summaryB}`, row.tags),
			)
		: [];

	// A schema diff is only shown while one of the endpoints it explains is.
	const shownChanged = new Set(changed.map((row) => row.id));
	const changedSchemas = result.changedSchemas.filter(
		(schema) =>
			!(filters.ignoreDocsOnly && schema.docsOnly) &&
			schema.affectedEndpointIds.some((id) => shownChanged.has(id)),
	);

	return { ...result, added, removed, changed, changedSchemas };
}

/** Methods present in the diff, in display order. */
export function resultMethods(result: OpenApiCompareOk): HttpMethod[] {
	const methods = new Set<HttpMethod>();
	for (const { id } of [...result.added, ...result.removed, ...result.changed]) {
		const method = parseEndpointId(id)?.method;
		if (method) methods.add(method);
	}
	return HTTP_METHOD_ORDER.filter((method) => methods.has(method));
}

/** Tags present in the diff, alphabetically. */
export function resultTags(result: OpenApiCompareOk): string[] {
	const tags = new Set<string>();
	for (const item of [...result.added, ...result.removed, ...result.changed]) {
		for (const tag of item.tags) tags.add(tag);
	}
	return [...tags].sort((a, b) => a.localeCompare(b));
}

/** Human-readable list of the active filters, for exports. */
export function describeFilters(filters: CompareFilters): string[] {
	const lines: string[] = [];
	if (filters.statuses.length < STATUS_ORDER.length) {
		lines.push(`status: ${filters.statuses.join(", ") || "none"}`);
	}
	if (filters.methods.length > 0) {
		lines.push(`method: ${filters.methods.map((m) => m.toUpperCase()).join(", ")}`);
	}
	if (filters.tags.length > 0) lines.push(`tag: ${filters.tags.join(", ")}`);
	if (filters.query.trim()) lines.push(`search: "${filters.query.trim()}"`);
	if (filters.ignoreDocsOnly) lines.push("docs-only changes hidden");
	return lines;
}
