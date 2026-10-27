import { describe, expect, it } from "vitest";
import type { EndpointItem } from "@/types/openapi";
import { loadFixture } from "./__fixtures__";
import { buildEndpointIndex } from "./swaggerMinifier";
import {
	ALL_ENDPOINTS_GROUP_KEY,
	filterEndpointsByQuery,
	firstPathSegment,
	groupEndpoints,
} from "./endpointFilter";

const endpoints: EndpointItem[] = buildEndpointIndex(loadFixture("openapi3"));
const ids = (items: EndpointItem[]) => items.map((e) => e.id);

describe("filterEndpointsByQuery", () => {
	it("returns everything for an empty or whitespace query", () => {
		expect(filterEndpointsByQuery(endpoints, "")).toEqual(endpoints);
		expect(filterEndpointsByQuery(endpoints, "   ")).toEqual(endpoints);
	});

	it("matches path, summary, tags and method case-insensitively", () => {
		expect(ids(filterEndpointsByQuery(endpoints, "INVENTORY"))).toEqual(["GET /stores/{storeId}/inventory"]);
		expect(ids(filterEndpointsByQuery(endpoints, "create"))).toEqual(["POST /pets"]);
		expect(ids(filterEndpointsByQuery(endpoints, "admin"))).toEqual(["DELETE /pets/{petId}"]);
		expect(ids(filterEndpointsByQuery(endpoints, "delete"))).toEqual(["DELETE /pets/{petId}"]);
		expect(ids(filterEndpointsByQuery(endpoints, "  health "))).toEqual(["GET /health"]);
	});

	it("matches across the method/path boundary", () => {
		expect(ids(filterEndpointsByQuery(endpoints, "post /pets"))).toEqual(["POST /pets"]);
	});

	it("filters by method, alone or with a query", () => {
		expect(ids(filterEndpointsByQuery(endpoints, "", ["post", "delete"]))).toEqual([
			"POST /pets",
			"DELETE /pets/{petId}",
		]);
		expect(ids(filterEndpointsByQuery(endpoints, "pets", ["get"]))).toEqual([
			"GET /pets",
			"GET /pets/{petId}",
		]);
		// An empty method list means "no method filter".
		expect(filterEndpointsByQuery(endpoints, "", [])).toEqual(endpoints);
	});

	it("returns nothing when nothing matches", () => {
		expect(filterEndpointsByQuery(endpoints, "zzz")).toEqual([]);
	});
});

describe("firstPathSegment", () => {
	it("returns the first non-empty segment", () => {
		expect(firstPathSegment("/orders/{id}/items")).toBe("/orders");
		expect(firstPathSegment("orders")).toBe("/orders");
		expect(firstPathSegment("//double")).toBe("/double");
	});

	it("returns / for the root", () => {
		expect(firstPathSegment("/")).toBe("/");
		expect(firstPathSegment("")).toBe("/");
	});
});

describe("groupEndpoints", () => {
	it("puts everything in one group in `none` mode", () => {
		expect(groupEndpoints(endpoints, "none")).toEqual([
			{ key: ALL_ENDPOINTS_GROUP_KEY, label: "All endpoints", endpoints },
		]);
	});

	it("groups by first tag, falling back to the path segment for untagged endpoints", () => {
		const groups = groupEndpoints(endpoints, "tag");
		expect(groups.map((g) => [g.key, g.label, ids(g.endpoints)])).toEqual([
			// DELETE has tags ["pets", "admin"] and lands in "pets" only.
			["tag:pets", "pets", ["GET /pets", "POST /pets", "GET /pets/{petId}", "DELETE /pets/{petId}"]],
			["path:/stores", "/stores", ["GET /stores/{storeId}/inventory"]],
			["path:/health", "/health", ["GET /health"]],
		]);
	});

	it("groups by path segment in `path` mode", () => {
		const groups = groupEndpoints(endpoints, "path");
		expect(groups.map((g) => [g.key, g.endpoints.length])).toEqual([
			["path:/pets", 4],
			["path:/stores", 1],
			["path:/health", 1],
		]);
	});

	it("keeps a tag group and a same-named path group apart", () => {
		const items: EndpointItem[] = [
			{ id: "GET /a", method: "get", path: "/a", summary: "", tags: ["/a"] },
			{ id: "GET /a/b", method: "get", path: "/a/b", summary: "", tags: [] },
		];
		expect(groupEndpoints(items, "tag").map((g) => g.key)).toEqual(["tag:/a", "path:/a"]);
	});

	it("returns no groups for no endpoints, except in `none` mode", () => {
		expect(groupEndpoints([], "tag")).toEqual([]);
		expect(groupEndpoints([], "none")).toHaveLength(1);
	});
});
