import { describe, expect, it } from "vitest";
import { readFixture } from "./__fixtures__";
import { parseOpenApiInput } from "./openApiInput";

describe("parseOpenApiInput", () => {
	it("returns no doc and no error for empty input", () => {
		expect(parseOpenApiInput("")).toEqual({ doc: null, error: "" });
		expect(parseOpenApiInput("  \n\t ")).toEqual({ doc: null, error: "" });
	});

	it("parses OpenAPI 3 and Swagger 2 documents", () => {
		const openApi = parseOpenApiInput(readFixture("openapi3"));
		expect(openApi.error).toBe("");
		expect(openApi.doc?.openapi).toBe("3.0.3");

		const swagger = parseOpenApiInput(readFixture("swagger2"));
		expect(swagger.error).toBe("");
		expect(swagger.doc?.swagger).toBe("2.0");
	});

	it("tolerates surrounding whitespace", () => {
		expect(parseOpenApiInput(`\n  ${JSON.stringify({ paths: {} })}  \n`).doc).toEqual({ paths: {} });
	});

	it("rejects invalid JSON", () => {
		expect(parseOpenApiInput("{ paths: {} }")).toEqual({
			doc: null,
			error: "Invalid JSON. Please paste a valid swagger.json.",
		});
	});

	it("rejects JSON without a paths object", () => {
		const missing = { doc: null, error: "Invalid OpenAPI/Swagger: missing `paths` object." };
		expect(parseOpenApiInput('{"openapi":"3.0.0"}')).toEqual(missing);
		expect(parseOpenApiInput('{"paths":"nope"}')).toEqual(missing);
		expect(parseOpenApiInput('{"paths":null}')).toEqual(missing);
	});

	it("rejects JSON that is not an object, without throwing", () => {
		for (const input of ["42", '"text"', "[]", "null"]) {
			const result = parseOpenApiInput(input);
			expect(result.doc).toBeNull();
			expect(result.error).not.toBe("");
		}
	});

	it("parses duplicate keys the way JSON.parse does: the last one wins", () => {
		const { doc } = parseOpenApiInput(readFixture("duplicate-keys"));
		expect(doc?.paths?.["/mrp/trace"]?.get?.summary).toBe("Trace again");
		expect(doc?.components?.schemas?.Thing).toEqual({ type: "integer" });
	});
});
