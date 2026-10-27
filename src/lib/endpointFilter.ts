import type { EndpointItem, HttpMethod } from "../types/openapi";

export function filterEndpointsByQuery(
	endpoints: EndpointItem[],
	query: string,
	selectedMethods?: HttpMethod[],
): EndpointItem[] {
	const q = query.trim().toLowerCase();

	return endpoints.filter((item) => {
		if (selectedMethods && selectedMethods.length > 0) {
			if (!selectedMethods.includes(item.method)) return false;
		}

		if (!q) return true;

		const haystack =
			`${item.method} ${item.path} ${item.summary} ${item.tags.join(" ")}`.toLowerCase();
		return haystack.includes(q);
	});
}

export type EndpointGroupMode = "tag" | "path" | "none";

export type EndpointGroup = {
	/** Stable across modes: `tag:<name>` or `path:/<segment>`. */
	key: string;
	label: string;
	endpoints: EndpointItem[];
};

export const ALL_ENDPOINTS_GROUP_KEY = "all";

/** `/orders/{id}/items` → `/orders`. */
export function firstPathSegment(path: string): string {
	const segment = path.split("/").find(Boolean);
	return segment ? `/${segment}` : "/";
}

/**
 * Groups endpoints in spec order. An operation with several tags lands in its
 * first tag only, so every endpoint appears exactly once; untagged operations
 * fall back to their first path segment.
 */
export function groupEndpoints(
	endpoints: EndpointItem[],
	mode: EndpointGroupMode,
): EndpointGroup[] {
	if (mode === "none") {
		return [{ key: ALL_ENDPOINTS_GROUP_KEY, label: "All endpoints", endpoints }];
	}

	const groups = new Map<string, EndpointGroup>();
	for (const endpoint of endpoints) {
		const tag = mode === "tag" ? endpoint.tags[0] : undefined;
		const label = tag ?? firstPathSegment(endpoint.path);
		const key = tag ? `tag:${tag}` : `path:${label}`;

		const group = groups.get(key);
		if (group) group.endpoints.push(endpoint);
		else groups.set(key, { key, label, endpoints: [endpoint] });
	}

	return Array.from(groups.values());
}
