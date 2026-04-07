import type { EndpointItem } from "../types/openapi";

export function filterEndpointsByQuery(
	endpoints: EndpointItem[],
	query: string,
): EndpointItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return endpoints;

	return endpoints.filter((item) => {
		const haystack =
			`${item.method} ${item.path} ${item.summary}`.toLowerCase();
		return haystack.includes(q);
	});
}
