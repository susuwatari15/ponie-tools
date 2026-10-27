import { describe, expect, it } from "vitest";
import type { OpenApiDocument } from "@/types/openapi";
import { loadFixture, readFixture } from "./__fixtures__";
import {
	buildEndpointsClipboardText,
	compareOpenApiRawJson,
	type OpenApiCompareOk,
} from "./openApiCompare";

const labels = { labelA: "v1", labelB: "v2" };

function compare(a: OpenApiDocument, b: OpenApiDocument): OpenApiCompareOk {
	const result = compareOpenApiRawJson(JSON.stringify(a), JSON.stringify(b), labels);
	if (!result.ok) throw new Error(`Unexpected compare error: ${result.error}`);
	return result;
}

/** Endpoints whose response reaches Pet (and so Owner -> Address and Category). */
const PET_ENDPOINTS = ["GET /pets", "POST /pets", "GET /pets/{petId}"];

describe("compareOpenApiRawJson", () => {
	it("reports nothing for identical specs", () => {
		const result = compare(loadFixture("openapi3"), loadFixture("openapi3"));
		expect(result).toMatchObject({
			ok: true,
			labelA: "v1",
			labelB: "v2",
			added: [],
			removed: [],
			changed: [],
			changedSchemas: [],
		});
	});

	it("classifies added and removed endpoints", () => {
		const a = loadFixture("openapi3");
		const b = loadFixture("openapi3");
		delete b.paths!["/health"];
		b.paths!["/owners"] = { get: { summary: "List owners", tags: ["owners"] } };
		delete b.paths!["/pets/{petId}"]!.delete;

		const result = compare(a, b);
		expect(result.added).toEqual([{ id: "GET /owners", summary: "List owners", tags: ["owners"] }]);
		expect(result.removed).toEqual([
			{ id: "DELETE /pets/{petId}", summary: "Delete pet", tags: ["pets", "admin"] },
			{ id: "GET /health", summary: "", tags: [] },
		]);
		expect(result.changed).toEqual([]);
	});

	it("attributes a change deep in a $ref chain to its root-cause schema", () => {
		const a = loadFixture("openapi3");
		const b = loadFixture("openapi3");
		b.components!.schemas!.Address!.properties!.zip = { type: "string" };

		const result = compare(a, b);
		expect(result.changed.map((c) => c.id)).toEqual(PET_ENDPOINTS);
		for (const change of result.changed) {
			expect(change).toMatchObject({ ownChanged: false, viaSchemas: ["Address"], docsOnly: false });
		}
		// Owner and Pet change only through Address, so only Address is reported.
		expect(result.changedSchemas).toHaveLength(1);
		expect(result.changedSchemas[0]).toMatchObject({
			name: "Address",
			status: "changed",
			affectedEndpointIds: PET_ENDPOINTS,
			docsOnly: false,
		});
		expect(result.changedSchemas[0]?.right?.properties?.zip).toEqual({ type: "string" });
		expect(result.changedSchemas[0]?.left?.properties?.zip).toBeUndefined();
	});

	it("keeps refs as names in the endpoint diff", () => {
		const a = loadFixture("openapi3");
		const b = loadFixture("openapi3");
		b.components!.schemas!.Address!.properties!.zip = { type: "string" };

		const change = compare(a, b).changed.find((c) => c.id === "GET /pets/{petId}");
		expect(change?.left?.response).toEqual({ $ref: "Pet" });
		expect(change?.right?.response).toEqual({ $ref: "Pet" });
	});

	it("flags schema changes that only touch documentation as docsOnly", () => {
		const a = loadFixture("openapi3");
		const b = loadFixture("openapi3");
		b.components!.schemas!.Address!.properties!.city!.description = "City name";

		const result = compare(a, b);
		expect(result.changed.map((c) => c.id)).toEqual(PET_ENDPOINTS);
		expect(result.changed.every((c) => c.docsOnly)).toBe(true);
		expect(result.changedSchemas[0]).toMatchObject({ name: "Address", docsOnly: true });
	});

	it("does not treat a change to a property *named* description as docs-only", () => {
		const a = loadFixture("openapi3");
		const b = loadFixture("openapi3");
		b.components!.schemas!.Address!.properties!.description!.type = "integer";

		const result = compare(a, b);
		expect(result.changedSchemas[0]).toMatchObject({ name: "Address", docsOnly: false });
	});

	it("detects an endpoint's own change", () => {
		const a = loadFixture("openapi3");
		const b = loadFixture("openapi3");
		b.paths!["/pets"]!.get!.parameters!.push({ name: "offset", in: "query", schema: { type: "integer" } });
		b.paths!["/pets"]!.get!.tags = ["pets", "v2"];

		const result = compare(a, b);
		expect(result.changed).toHaveLength(1);
		expect(result.changed[0]).toMatchObject({
			id: "GET /pets",
			ownChanged: true,
			viaSchemas: [],
			docsOnly: false,
			tags: ["pets", "v2"],
		});
		expect(result.changedSchemas).toEqual([]);
	});

	it("treats a summary-only edit as a docs-only own change", () => {
		const a = loadFixture("openapi3");
		const b = loadFixture("openapi3");
		b.paths!["/pets/{petId}"]!.get!.summary = "Fetch a pet";

		const result = compare(a, b);
		expect(result.changed).toEqual([
			expect.objectContaining({
				id: "GET /pets/{petId}",
				summaryA: "Get pet",
				summaryB: "Fetch a pet",
				ownChanged: true,
				docsOnly: true,
			}),
		]);
	});

	it("classifies a newly referenced schema as added, and the reverse as removed", () => {
		const a = loadFixture("openapi3");
		const b = loadFixture("openapi3");
		b.components!.schemas!.Toy = { type: "object", properties: { label: { type: "string" } } };
		b.components!.schemas!.Pet!.properties!.toy = { $ref: "#/components/schemas/Toy" };

		const forward = compare(a, b);
		expect(forward.changed.map((c) => c.viaSchemas)).toEqual([
			["Pet", "Toy"],
			["Pet", "Toy"],
			["Pet", "Toy"],
		]);
		expect(forward.changedSchemas.map((s) => [s.name, s.status])).toEqual([
			["Pet", "changed"],
			["Toy", "added"],
		]);
		const toy = forward.changedSchemas[1];
		expect(toy?.left).toBeUndefined();
		expect(toy?.docsOnly).toBe(false);

		const backward = compare(b, a);
		expect(backward.changedSchemas.map((s) => [s.name, s.status])).toEqual([
			["Pet", "changed"],
			["Toy", "removed"],
		]);
	});

	it("follows self-referencing schemas without looping", () => {
		const a = loadFixture("openapi3");
		const b = loadFixture("openapi3");
		b.components!.schemas!.Category!.properties!.slug = { type: "string" };

		const result = compare(a, b);
		expect(result.changed.map((c) => c.id)).toEqual(PET_ENDPOINTS);
		expect(result.changedSchemas.map((s) => s.name)).toEqual(["Category"]);
	});

	it("ignores changes to schemas no shared endpoint reaches", () => {
		const a = loadFixture("openapi3");
		const b = loadFixture("openapi3");
		b.components!.schemas!.Unused = { type: "integer" };

		const result = compare(a, b);
		expect(result.changed).toEqual([]);
		expect(result.changedSchemas).toEqual([]);
	});

	it("only flags endpoints that actually reach the changed schema", () => {
		const a = loadFixture("openapi3");
		const b = loadFixture("openapi3");
		b.components!.schemas!.NewPet!.properties!.kind!.enum = ["dog", "cat", "bird"];

		const result = compare(a, b);
		expect(result.changed.map((c) => c.id)).toEqual(["POST /pets"]);
		expect(result.changedSchemas[0]).toMatchObject({ name: "NewPet", affectedEndpointIds: ["POST /pets"] });
	});

	it("compares Swagger 2 definitions", () => {
		const a = loadFixture("swagger2");
		const b = loadFixture("swagger2");
		b.definitions!.Role!.enum = ["admin", "member", "guest"];

		const result = compare(a, b);
		expect(result.changed.map((c) => [c.id, c.viaSchemas])).toEqual([
			["GET /users/{id}", ["Role"]],
			["POST /users", ["Role"]],
		]);
	});

	it("returns diagnostics for both sides, using the raw text", () => {
		const result = compareOpenApiRawJson(readFixture("duplicate-keys"), readFixture("openapi3"), labels);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.diagnosticsA.diagnostics.filter((d) => d.code === "duplicate-json-key")).toHaveLength(2);
		expect(result.diagnosticsB.errorCount).toBe(0);
	});

	it("reports which side failed to parse", () => {
		const valid = readFixture("openapi3");
		expect(compareOpenApiRawJson("{ nope", valid, labels)).toEqual({
			ok: false,
			error: "Invalid JSON. Please paste a valid swagger.json.",
			side: "a",
		});
		expect(compareOpenApiRawJson(valid, '{"openapi":"3.0.0"}', labels)).toEqual({
			ok: false,
			error: "Invalid OpenAPI/Swagger: missing `paths` object.",
			side: "b",
		});
		expect(compareOpenApiRawJson(valid, "   ", labels)).toMatchObject({
			ok: false,
			error: "Invalid OpenAPI JSON (B).",
			side: "b",
		});
	});
});

describe("buildEndpointsClipboardText", () => {
	const raw = readFixture("openapi3");

	it("returns null for no endpoints or invalid input", () => {
		expect(buildEndpointsClipboardText(raw, [], "full")).toBeNull();
		expect(buildEndpointsClipboardText("not json", ["GET /pets"], "full")).toBeNull();
	});

	it("formats the minified selection as pretty or compact JSON", () => {
		const full = buildEndpointsClipboardText(raw, ["GET /health"], "full");
		const compact = buildEndpointsClipboardText(raw, ["GET /health"], "minified");
		const expected = {
			openapi: "3.0.3",
			info: { title: "Pet Store", version: "1.0.0" },
			paths: { "/health": { get: {} } },
		};
		expect(full).toBe(JSON.stringify(expected, null, 2));
		expect(compact).toBe(JSON.stringify(expected));
	});
});
