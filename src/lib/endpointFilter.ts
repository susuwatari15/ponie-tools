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
			`${item.method} ${item.path} ${item.summary}`.toLowerCase();
		return haystack.includes(q);
	});
}
