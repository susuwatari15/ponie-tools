import { describe, expect, it } from "vitest";
import type { OpenApiDocument } from "@/types/openapi";
import { loadFixture } from "./__fixtures__";
import {
	buildEndpointIndex,
	compressSchema,
	DEFAULT_MINIFY_OPTIONS,
	getMinifiedOperationForEndpoint,
	minifySwagger,
	minifySwaggerObject,
	minifySwaggerWithOptions,
	parseEndpointId,
	schemaToTs,
} from "./swaggerMinifier";

const PET_INLINED = {
	type: "object",
	properties: {
		id: { type: "string", format: "uuid", required: true },
		name: { type: "string", description: "Pet name", example: "Rex", required: true },
		owner: {
			type: "object",
			properties: {
				name: { type: "string" },
				address: {
					type: "object",
					properties: {
						city: { type: "string" },
						description: { type: "string", description: "Free-form note" },
					},
				},
			},
		},
		category: {
			type: "object",
			properties: {
				name: { type: "string" },
				// Self-reference: the cycle is cut with a named ref instead of recursing forever.
				parent: { $ref: "Category" },
			},
		},
		legacyCode: { type: "string" },
	},
};

describe("buildEndpointIndex", () => {
	it("lists every operation in path order, then method order", () => {
		const index = buildEndpointIndex(loadFixture("openapi3"));
		expect(index.map((e) => e.id)).toEqual([
			"GET /pets",
			"POST /pets",
			"GET /pets/{petId}",
			"DELETE /pets/{petId}",
			"GET /stores/{storeId}/inventory",
			"GET /health",
		]);
	});

	it("captures method, path, summary and tags", () => {
		const index = buildEndpointIndex(loadFixture("openapi3"));
		expect(index[3]).toEqual({
			id: "DELETE /pets/{petId}",
			method: "delete",
			path: "/pets/{petId}",
			summary: "Delete pet",
			tags: ["pets", "admin"],
		});
		// No summary, no operationId, no tags.
		expect(index[5]).toMatchObject({ summary: "", tags: [] });
	});

	it("falls back to operationId when there is no summary", () => {
		const doc: OpenApiDocument = { paths: { "/a": { get: { operationId: "getA" } } } };
		expect(buildEndpointIndex(doc)[0]?.summary).toBe("getA");
	});

	it("ignores path-item keys that are not HTTP methods", () => {
		const index = buildEndpointIndex(loadFixture("openapi3"));
		expect(index.filter((e) => e.path === "/pets/{petId}")).toHaveLength(2);
	});

	it("handles a Swagger 2 document and a missing paths object", () => {
		expect(buildEndpointIndex(loadFixture("swagger2")).map((e) => e.id)).toEqual([
			"GET /users/{id}",
			"POST /users",
		]);
		expect(buildEndpointIndex({})).toEqual([]);
	});
});

describe("parseEndpointId", () => {
	it("splits method and path", () => {
		expect(parseEndpointId("GET /pets/{petId}")).toEqual({ method: "get", path: "/pets/{petId}" });
	});

	it("keeps spaces inside the path", () => {
		expect(parseEndpointId("POST /a b")).toEqual({ method: "post", path: "/a b" });
	});

	it("rejects unknown methods and ids without a path", () => {
		expect(parseEndpointId("FETCH /pets")).toBeNull();
		expect(parseEndpointId("GET")).toBeNull();
		expect(parseEndpointId("")).toBeNull();
	});
});

describe("compressSchema", () => {
	it("follows a $ref chain (Pet -> Owner -> Address) and marks required properties", () => {
		const doc = loadFixture("openapi3");
		expect(compressSchema({ $ref: "#/components/schemas/Pet" }, doc)).toEqual(PET_INLINED);
	});

	it("keeps refs as names when inlineRefs is false", () => {
		const doc = loadFixture("openapi3");
		const pet = compressSchema({ $ref: "#/components/schemas/Pet" }, doc, { inlineRefs: false });
		expect(pet).toEqual({ $ref: "Pet" });

		const owner = compressSchema(doc.components!.schemas!.Owner, doc, { inlineRefs: false });
		expect(owner).toEqual({
			type: "object",
			properties: { name: { type: "string" }, address: { $ref: "Address" } },
		});
	});

	it("leaves an unresolvable ref as a bare name", () => {
		expect(compressSchema({ $ref: "#/components/schemas/Missing" }, loadFixture("openapi3"))).toEqual({
			$ref: "Missing",
		});
	});

	it("drops deprecated properties when asked", () => {
		const doc = loadFixture("openapi3");
		const pet = compressSchema({ $ref: "#/components/schemas/Pet" }, doc, { dropDeprecated: true });
		expect(Object.keys(pet?.properties ?? {})).toEqual(["id", "name", "owner", "category"]);
	});

	it("resolves Swagger 2 definitions", () => {
		const doc = loadFixture("swagger2");
		expect(compressSchema({ $ref: "#/definitions/User" }, doc)).toEqual({
			type: "object",
			properties: {
				id: { type: "integer", required: true },
				roles: { type: "array", items: { type: "string", enum: ["admin", "member"] } },
			},
		});
	});

	it("returns undefined for a missing schema", () => {
		expect(compressSchema(undefined, {})).toBeUndefined();
	});
});

describe("schemaToTs", () => {
	const doc = loadFixture("openapi3");

	it("renders a $ref chain as an inline type, cutting cycles by name", () => {
		expect(schemaToTs({ $ref: "#/components/schemas/Pet" }, doc)).toBe(
			"{ id: string; name: string; owner?: { name?: string; address?: { city?: string; description?: string } }; category?: { name?: string; parent?: Category }; legacyCode?: string }",
		);
	});

	it("renders primitives, arrays, enums and maps", () => {
		expect(schemaToTs({ type: "integer" }, doc)).toBe("number");
		expect(schemaToTs({ type: "array", items: { type: "boolean" } }, doc)).toBe("boolean[]");
		expect(schemaToTs({ enum: ["a", 1, null, true] }, doc)).toBe('"a" | 1 | null | true');
		expect(schemaToTs({ type: "object", additionalProperties: { type: "string" } }, doc)).toBe(
			"Record<string, string>",
		);
		expect(schemaToTs({ type: "object" }, doc)).toBe("Record<string, unknown>");
	});

	it("renders compositions", () => {
		expect(schemaToTs({ oneOf: [{ type: "string" }, { type: "number" }] }, doc)).toBe("string | number");
		expect(schemaToTs({ anyOf: [{ type: "string" }, { type: "null" }] }, doc)).toBe("string | null");
		expect(
			schemaToTs({ allOf: [{ $ref: "#/components/schemas/Error" }, { type: "object", properties: { x: { type: "string" } } }] }, doc),
		).toBe("{ code?: number; message?: string } & { x?: string }");
	});

	it("falls back to the ref name or unknown", () => {
		expect(schemaToTs({ $ref: "#/components/schemas/Missing" }, doc)).toBe("Missing");
		expect(schemaToTs(undefined, doc)).toBe("unknown");
		expect(schemaToTs({}, doc)).toBe("unknown");
	});
});

describe("minifySwaggerObject", () => {
	it("keeps only the selected endpoints, with refs inlined", () => {
		const out = minifySwaggerObject(["GET /pets/{petId}"], loadFixture("openapi3"));
		expect(out).toEqual({
			openapi: "3.0.3",
			info: { title: "Pet Store", version: "1.0.0" },
			paths: {
				"/pets/{petId}": {
					get: {
						summary: "Get pet",
						tags: ["pets"],
						// Path-item level parameters are merged into the operation.
						request: { path: { petId: { type: "string", required: true } } },
						// 200 is picked over the 404 declared before it.
						response: PET_INLINED,
					},
				},
			},
		});
	});

	it("merges several methods of one path and skips unknown or malformed ids", () => {
		const out = minifySwaggerObject(
			["GET /pets", "POST /pets", "GET /nope", "garbage", "PATCH /pets"],
			loadFixture("openapi3"),
		);
		expect(Object.keys(out.paths)).toEqual(["/pets"]);
		expect(Object.keys(out.paths["/pets"]!)).toEqual(["get", "post"]);
	});

	it("extracts query parameters and an OpenAPI 3 request body", () => {
		const out = minifySwaggerObject(["GET /pets", "POST /pets"], loadFixture("openapi3"));
		const pets = out.paths["/pets"]!;
		expect(pets.get?.operationId).toBe("listPets");
		expect(pets.get?.request).toEqual({
			query: { limit: { type: "integer", minimum: 1, maximum: 100, description: "Max items" } },
		});
		expect(pets.get?.response).toEqual({ type: "array", items: PET_INLINED });
		expect(pets.post?.description).toBe("Adds a pet to the store.");
		expect(pets.post?.request?.body).toEqual({
			type: "object",
			properties: {
				name: { type: "string", required: true },
				kind: { type: "string", enum: ["dog", "cat"] },
			},
		});
	});

	it("handles additionalProperties maps and operations without a response schema", () => {
		const out = minifySwaggerObject(
			["GET /stores/{storeId}/inventory", "GET /health"],
			loadFixture("openapi3"),
		);
		expect(out.paths["/stores/{storeId}/inventory"]?.get?.response).toEqual({
			type: "object",
			additionalProperties: { type: "integer" },
		});
		expect(out.paths["/health"]?.get).toEqual({});
	});

	it("reads Swagger 2 parameters, body parameters and response schemas", () => {
		const out = minifySwaggerObject(["GET /users/{id}", "POST /users"], loadFixture("swagger2"));
		expect(out.openapi).toBe("swagger-2.0");
		const user = {
			type: "object",
			properties: {
				id: { type: "integer", required: true },
				roles: { type: "array", items: { type: "string", enum: ["admin", "member"] } },
			},
		};
		expect(out.paths["/users/{id}"]?.get?.request).toEqual({
			path: { id: { type: "integer", format: "int64", required: true } },
			query: { fields: { type: "array", items: { type: "string" } } },
			// No type declared: defaults to string.
			header: { "X-Trace": { type: "string" } },
		});
		expect(out.paths["/users/{id}"]?.get?.response).toEqual(user);
		expect(out.paths["/users"]?.post?.request).toEqual({ body: user });
	});

	it("uses fallbacks for a bare document", () => {
		expect(minifySwaggerObject([], { paths: {} })).toEqual({
			openapi: "openapi-minified",
			info: { title: "Minified API", version: "0.0.0" },
			paths: {},
		});
	});
});

describe("getMinifiedOperationForEndpoint", () => {
	it("returns one minified operation", () => {
		const doc = loadFixture("openapi3");
		expect(getMinifiedOperationForEndpoint("GET /pets/{petId}", doc)?.summary).toBe("Get pet");
		expect(getMinifiedOperationForEndpoint("GET /missing", doc)).toBeUndefined();
		expect(getMinifiedOperationForEndpoint("nope", doc)).toBeUndefined();
	});
});

describe("minifySwaggerWithOptions", () => {
	it("defaults to the plain minified output", () => {
		const doc = loadFixture("openapi3");
		expect(minifySwaggerWithOptions(["GET /pets"], doc)).toEqual(minifySwaggerObject(["GET /pets"], doc));
	});

	it("emits only the schemas reachable from the selection when refs are not inlined", () => {
		const out = minifySwaggerWithOptions(["GET /pets/{petId}"], loadFixture("openapi3"), {
			...DEFAULT_MINIFY_OPTIONS,
			inlineRefs: false,
		});
		expect(out.paths["/pets/{petId}"]?.get?.response).toEqual({ $ref: "Pet" });
		// Transitive: Pet -> Owner -> Address, plus the self-referencing Category.
		// Error (404 only), NewPet and Unused are not reachable.
		expect(Object.keys(out.schemas ?? {})).toEqual(["Address", "Category", "Owner", "Pet"]);
		expect(out.schemas?.Pet?.properties?.owner).toEqual({ $ref: "Owner" });
		expect(out.schemas?.Category?.properties?.parent).toEqual({ $ref: "Category" });
	});

	it("omits schemas when nothing is referenced", () => {
		const out = minifySwaggerWithOptions(["GET /health"], loadFixture("openapi3"), {
			...DEFAULT_MINIFY_OPTIONS,
			inlineRefs: false,
		});
		expect(out.schemas).toBeUndefined();
	});

	it("drops deprecated operations and properties", () => {
		const out = minifySwaggerWithOptions(
			["GET /pets/{petId}", "DELETE /pets/{petId}"],
			loadFixture("openapi3"),
			{ ...DEFAULT_MINIFY_OPTIONS, dropDeprecated: true },
		);
		expect(Object.keys(out.paths["/pets/{petId}"]!)).toEqual(["get"]);
		expect(out.paths["/pets/{petId}"]?.get?.response?.properties?.legacyCode).toBeUndefined();
	});

	it("attaches effective security and only the schemes in use", () => {
		const options = { ...DEFAULT_MINIFY_OPTIONS, keepSecuritySchemes: true };
		const out = minifySwaggerWithOptions(["GET /pets/{petId}"], loadFixture("openapi3"), options);
		// Inherited from the document-level `security`.
		expect(out.paths["/pets/{petId}"]?.get?.security).toEqual([{ bearerAuth: [] }]);
		expect(Object.keys(out.securitySchemes ?? {})).toEqual(["bearerAuth"]);

		const both = minifySwaggerWithOptions(
			["GET /pets/{petId}", "DELETE /pets/{petId}"],
			loadFixture("openapi3"),
			options,
		);
		// The operation-level requirement overrides the document one.
		expect(both.paths["/pets/{petId}"]?.delete?.security).toEqual([{ apiKey: [] }]);
		expect(Object.keys(both.securitySchemes ?? {}).sort()).toEqual(["apiKey", "bearerAuth"]);
	});

	it("reads Swagger 2 securityDefinitions and skips operations without security", () => {
		const out = minifySwaggerWithOptions(["GET /users/{id}", "POST /users"], loadFixture("swagger2"), {
			...DEFAULT_MINIFY_OPTIONS,
			keepSecuritySchemes: true,
		});
		expect(out.paths["/users/{id}"]?.get?.security).toEqual([{ basic: [] }]);
		expect(out.paths["/users"]?.post?.security).toBeUndefined();
		expect(out.securitySchemes).toEqual({ basic: { type: "basic", description: "HTTP basic" } });
	});

	it("strips descriptions structurally, keeping a property named `description`", () => {
		const out = minifySwaggerWithOptions(["GET /pets/{petId}", "POST /pets"], loadFixture("openapi3"), {
			...DEFAULT_MINIFY_OPTIONS,
			stripDescriptions: true,
			keepSecuritySchemes: true,
		});
		expect(out.paths["/pets"]?.post?.description).toBeUndefined();
		const response = out.paths["/pets/{petId}"]?.get?.response;
		expect(response?.properties?.name).toEqual({ type: "string", example: "Rex", required: true });
		expect(response?.properties?.owner?.properties?.address?.properties?.description).toEqual({
			type: "string",
		});
		expect(out.securitySchemes?.bearerAuth).toEqual({ type: "http", scheme: "bearer" });
	});

	it("strips examples, including inside the shared schemas section", () => {
		const out = minifySwaggerWithOptions(["GET /pets/{petId}"], loadFixture("openapi3"), {
			...DEFAULT_MINIFY_OPTIONS,
			inlineRefs: false,
			stripExamples: true,
		});
		expect(out.schemas?.Pet?.properties?.name).toEqual({
			type: "string",
			description: "Pet name",
			required: true,
		});
	});

	it("minifySwagger returns the same output as pretty JSON", () => {
		const doc = loadFixture("openapi3");
		const text = minifySwagger(["GET /pets"], doc);
		expect(JSON.parse(text)).toEqual(minifySwaggerWithOptions(["GET /pets"], doc));
		expect(text).toContain("\n  ");
	});

	it("does not mutate the source document", () => {
		const doc = loadFixture("openapi3");
		const before = JSON.stringify(doc);
		minifySwaggerWithOptions(["GET /pets/{petId}", "POST /pets"], doc, {
			stripDescriptions: true,
			stripExamples: true,
			dropDeprecated: true,
			inlineRefs: false,
			keepSecuritySchemes: true,
		});
		expect(JSON.stringify(doc)).toBe(before);
	});
});
