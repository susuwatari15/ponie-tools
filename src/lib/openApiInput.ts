import type { OpenApiDocument } from "../types/openapi";

export interface ParsedOpenApiInput {
	doc: OpenApiDocument | null;
	error: string;
}

export function parseOpenApiInput(raw: string): ParsedOpenApiInput {
	const input = raw.trim();
	if (!input) return { doc: null, error: "" };

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
}
