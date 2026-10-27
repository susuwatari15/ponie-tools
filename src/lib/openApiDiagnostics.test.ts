import { describe, expect, it } from "vitest";
import type { OpenApiDocument, OperationObject } from "@/types/openapi";
import { loadFixture, readFixture } from "./__fixtures__";
import {
	collectOpenApiDiagnostics,
	describeDiagnosticCounts,
	EMPTY_DIAGNOSTICS_REPORT,
	formatDiagnosticsMarkdown,
	type DiagnosticCode,
	type OpenApiDiagnosticsReport,
} from "./openApiDiagnostics";

const codes = (report: OpenApiDiagnosticsReport): DiagnosticCode[] =>
	report.diagnostics.map((d) => d.code);

const withOperation = (path: string, operation: OperationObject): OpenApiDocument => ({
	paths: { [path]: { get: operation } },
});

describe("collectOpenApiDiagnostics", () => {
	it("finds nothing in clean fixtures", () => {
		const openApi = collectOpenApiDiagnostics(loadFixture("openapi3"), readFixture("openapi3"));
		const swagger = collectOpenApiDiagnostics(loadFixture("swagger2"), readFixture("swagger2"));
		expect(openApi.diagnostics).toEqual([]);
		expect(swagger.diagnostics).toEqual([]);
	});

	it("reports duplicate JSON keys only when given the raw text", () => {
		const raw = readFixture("duplicate-keys");
		const doc = JSON.parse(raw) as OpenApiDocument;

		expect(codes(collectOpenApiDiagnostics(doc))).not.toContain("duplicate-json-key");

		const report = collectOpenApiDiagnostics(doc, raw);
		const duplicates = report.diagnostics.filter((d) => d.code === "duplicate-json-key");
		expect(duplicates).toHaveLength(2);
		expect(duplicates[0]).toMatchObject({ severity: "error", title: "Duplicate JSON key `get`" });
		expect(duplicates[0]?.detail).toContain("Line 10 repeats a key first seen on line 6");
		expect(duplicates[0]?.detail).toContain("inside `paths//mrp/trace`");
		expect(duplicates[0]?.endpointId).toBeUndefined();
		expect(report.errorCount).toBe(2);
	});

	it("flags duplicate parameters, and conflicting types among them", () => {
		const doc = withOperation("/search", {
			parameters: [
				{ name: "q", in: "query", type: "string" },
				{ name: "q", in: "query", type: "integer" },
				{ name: "page", in: "query", type: "integer" },
				{ name: "page", in: "query", type: "integer" },
				// Same name, different location: not a duplicate.
				{ name: "q", in: "header", type: "string" },
			],
		});
		const report = collectOpenApiDiagnostics(doc);
		expect(report.diagnostics.map((d) => [d.code, d.title])).toEqual([
			["duplicate-parameter", "Duplicate query parameter `q`"],
			["conflicting-parameter-type", "Conflicting declarations for `q`"],
			["duplicate-parameter", "Duplicate query parameter `page`"],
		]);
		expect(report.diagnostics.every((d) => d.endpointId === "GET /search")).toBe(true);
		expect(report.errorCount).toBe(3);
	});

	it("allows an operation parameter to override a path-item parameter", () => {
		const doc: OpenApiDocument = {
			paths: {
				"/items/{id}": {
					parameters: [{ name: "id", in: "path", required: true, type: "string" }],
					get: {
						summary: "Get item",
						parameters: [{ name: "id", in: "path", required: true, type: "integer" }],
					},
				},
			},
		};
		expect(collectOpenApiDiagnostics(doc).diagnostics).toEqual([]);
	});

	it("flags undeclared and unused path parameters", () => {
		const doc = withOperation("/orgs/{org}/repos/{repo}", {
			parameters: [{ name: "owner", in: "path", required: true, type: "string" }],
		});
		const report = collectOpenApiDiagnostics(doc);
		expect(report.diagnostics.map((d) => [d.code, d.severity, d.title])).toEqual([
			["path-param-mismatch", "warning", "Undeclared path parameters"],
			["path-param-mismatch", "warning", "Unused path parameter"],
		]);
		expect(report.diagnostics[0]?.detail).toContain("`org`, `repo` appear in the URL template");
		expect(report.diagnostics[1]?.detail).toContain("`owner` is declared");
		expect(report.warningCount).toBe(2);
	});

	it("flags unresolved schema references and caps the list", () => {
		const single = collectOpenApiDiagnostics(
			withOperation("/a", { responses: { "200": { schema: { $ref: "#/definitions/Missing" } } } }),
		);
		expect(single.diagnostics).toEqual([
			expect.objectContaining({
				code: "unresolved-ref",
				severity: "warning",
				endpointId: "GET /a",
				title: "Unresolved schema reference",
			}),
		]);
		expect(single.diagnostics[0]?.detail.startsWith("`Missing` not found")).toBe(true);

		const properties = Object.fromEntries(
			Array.from({ length: 12 }, (_, i) => [`p${i}`, { $ref: `#/components/schemas/M${i}` }]),
		);
		const many = collectOpenApiDiagnostics(
			withOperation("/b", { responses: { "200": { schema: { type: "object", properties } } } }),
		);
		expect(many.diagnostics[0]?.title).toBe("Unresolved schema references");
		expect(many.diagnostics[0]?.detail).toContain(", +2 more");
	});

	it("flags byte-identical operations on different routes", () => {
		const operation: OperationObject = { summary: "Trace", responses: { "200": {} } };
		const doc: OpenApiDocument = {
			paths: { "/trace": { get: operation }, "/mrp/trace": { get: { ...operation } } },
		};
		const report = collectOpenApiDiagnostics(doc);
		expect(report.diagnostics).toEqual([
			expect.objectContaining({
				code: "duplicate-operation-body",
				endpointId: "GET /trace",
				relatedEndpointIds: ["GET /mrp/trace"],
			}),
			expect.objectContaining({
				code: "duplicate-operation-body",
				endpointId: "GET /mrp/trace",
				relatedEndpointIds: ["GET /trace"],
			}),
		]);
	});

	it("does not flag identical bare operations", () => {
		const doc: OpenApiDocument = {
			paths: { "/health": { get: {} }, "/health/ready": { get: {} } },
		};
		expect(collectOpenApiDiagnostics(doc).diagnostics).toEqual([]);
	});

	it("flags repeated list values, case-variant tags and repeated security", () => {
		const report = collectOpenApiDiagnostics(
			withOperation("/a", {
				summary: "A",
				tags: ["pets", "pets", "Pets"],
				produces: ["application/json", "application/json"],
				security: [{ basic: [] }, { basic: [] }],
			}),
		);
		expect(report.diagnostics.map((d) => [d.code, d.title])).toEqual([
			["duplicate-list-value", "Repeated `tags` value"],
			["duplicate-list-value", "Tags differing only by case"],
			["duplicate-list-value", "Repeated `produces` value"],
			["duplicate-list-value", "Repeated `security` requirement"],
		]);
		expect(report.diagnostics[1]?.detail).toBe("`pets`, `Pets` — likely the same tag written two ways.");
		expect(report.warningCount).toBe(4);
		expect(report.errorCount).toBe(0);
	});

	it("warns when paths has no operations", () => {
		for (const doc of [{ paths: {} }, { paths: { "/a": { parameters: [] } } }] as OpenApiDocument[]) {
			const { diagnostics } = collectOpenApiDiagnostics(doc);
			expect(diagnostics).toEqual([
				expect.objectContaining({ code: "empty-paths", severity: "warning" }),
			]);
			expect(diagnostics[0]?.endpointId).toBeUndefined();
		}
	});

	it("indexes endpoint diagnostics by endpoint id", () => {
		const doc: OpenApiDocument = {
			paths: {
				"/a/{id}": { get: { summary: "A" }, post: { summary: "B", tags: ["x", "x"] } },
			},
		};
		const report = collectOpenApiDiagnostics(doc);
		expect([...report.byEndpoint.keys()]).toEqual(["GET /a/{id}", "POST /a/{id}"]);
		expect(report.byEndpoint.get("GET /a/{id}")?.map((d) => d.code)).toEqual(["path-param-mismatch"]);
		expect(report.byEndpoint.get("POST /a/{id}")?.map((d) => d.code)).toEqual([
			"duplicate-list-value",
			"path-param-mismatch",
		]);
	});
});

describe("describeDiagnosticCounts", () => {
	const report = (errorCount: number, warningCount: number): OpenApiDiagnosticsReport => ({
		...EMPTY_DIAGNOSTICS_REPORT,
		errorCount,
		warningCount,
	});

	it("pluralises and joins the counts", () => {
		expect(describeDiagnosticCounts(report(0, 0))).toBe("");
		expect(describeDiagnosticCounts(report(1, 0))).toBe("1 error");
		expect(describeDiagnosticCounts(report(0, 1))).toBe("1 warning");
		expect(describeDiagnosticCounts(report(9, 6))).toBe("9 errors · 6 warnings");
	});
});

describe("formatDiagnosticsMarkdown", () => {
	it("returns an empty string for a clean report", () => {
		expect(formatDiagnosticsMarkdown(EMPTY_DIAGNOSTICS_REPORT, "v1")).toBe("");
	});

	it("groups document-level findings first, then each endpoint", () => {
		const raw = readFixture("duplicate-keys");
		const doc: OpenApiDocument = {
			paths: { "/a": { get: { summary: "A", tags: ["x", "x"] } } },
		};
		const markdown = formatDiagnosticsMarkdown(collectOpenApiDiagnostics(doc, raw), "Spec A");
		const lines = markdown.split("\n");

		expect(lines[0]).toBe("## Spec A — spec issues");
		expect(lines[2]).toBe("2 errors · 1 warning");
		expect(markdown.indexOf("### Document")).toBeLessThan(markdown.indexOf("### `GET /a`"));
		expect(markdown).toContain("- **[error] Duplicate JSON key `get`** — Line 10");
		expect(markdown).toContain("- **[warning] Repeated `tags` value** — `x` listed more than once.");
		expect(markdown.endsWith("\n")).toBe(true);
	});

	it("uses a generic heading without a label", () => {
		const report = collectOpenApiDiagnostics({ paths: {} });
		expect(formatDiagnosticsMarkdown(report).startsWith("## Spec issues\n")).toBe(true);
	});
});
