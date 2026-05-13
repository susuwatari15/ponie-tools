import type { MinifiedOperation, OpenApiDocument } from "../types/openapi";
import {
	buildEndpointIndex,
	getMinifiedOperationForEndpoint,
	minifySwagger,
} from "./swaggerMinifier";
import { parseOpenApiInput } from "./openApiInput";
import { formatSwaggerEndpointsShort, type SwaggerCopyFormat } from "./swaggerShortFormat";

export type EndpointPresence = {
	id: string;
	summary: string;
};

export type ChangedEndpointDiff = {
	id: string;
	summaryA: string;
	summaryB: string;
	left: MinifiedOperation | undefined;
	right: MinifiedOperation | undefined;
};

export type OpenApiCompareResult =
	| {
			ok: true;
			labelA: string;
			labelB: string;
			added: EndpointPresence[];
			removed: EndpointPresence[];
			changed: ChangedEndpointDiff[];
	  }
	| {
			ok: false;
			error: string;
			side?: "a" | "b";
	  };

export type OpenApiCompareOk = Extract<OpenApiCompareResult, { ok: true }>;

function stableSerializeOp(op: MinifiedOperation | undefined): string {
	return JSON.stringify(op ?? null);
}

function summaryForEndpoint(doc: OpenApiDocument, id: string): string {
	const item = buildEndpointIndex(doc).find((e) => e.id === id);
	return item?.summary ?? "";
}

export function compareOpenApiRawJson(
	rawA: string,
	rawB: string,
	options: { labelA: string; labelB: string }
): OpenApiCompareResult {
	const parsedA = parseOpenApiInput(rawA.trim());
	if (parsedA.error || !parsedA.doc) {
		return { ok: false, error: parsedA.error || "Invalid OpenAPI JSON (A).", side: "a" };
	}

	const parsedB = parseOpenApiInput(rawB.trim());
	if (parsedB.error || !parsedB.doc) {
		return { ok: false, error: parsedB.error || "Invalid OpenAPI JSON (B).", side: "b" };
	}

	const endpointsA = buildEndpointIndex(parsedA.doc);
	const endpointsB = buildEndpointIndex(parsedB.doc);

	const setA = new Set(endpointsA.map((e) => e.id));
	const setB = new Set(endpointsB.map((e) => e.id));

	const added: EndpointPresence[] = [];
	const removed: EndpointPresence[] = [];
	const changed: ChangedEndpointDiff[] = [];

	for (const id of setB) {
		if (!setA.has(id)) {
			added.push({
				id,
				summary: summaryForEndpoint(parsedB.doc, id),
			});
		}
	}

	for (const id of setA) {
		if (!setB.has(id)) {
			removed.push({
				id,
				summary: summaryForEndpoint(parsedA.doc, id),
			});
		}
	}

	for (const id of setA) {
		if (!setB.has(id)) continue;

		const opA = getMinifiedOperationForEndpoint(id, parsedA.doc);
		const opB = getMinifiedOperationForEndpoint(id, parsedB.doc);

		if (stableSerializeOp(opA) !== stableSerializeOp(opB)) {
			changed.push({
				id,
				summaryA: summaryForEndpoint(parsedA.doc, id),
				summaryB: summaryForEndpoint(parsedB.doc, id),
				left: opA,
				right: opB,
			});
		}
	}

	return {
		ok: true,
		labelA: options.labelA,
		labelB: options.labelB,
		added,
		removed,
		changed,
	};
}

/** Minified JSON (same shape as Swagger Minifier output) for endpoints new or changed in B. */
export function buildMinifiedNewAndChangedFromVersionB(
	result: OpenApiCompareOk,
	rawJsonB: string
): string | null {
	const parsedB = parseOpenApiInput(rawJsonB.trim());
	if (parsedB.error || !parsedB.doc) return null;

	const ids = [
		...result.added.map((a) => a.id),
		...result.changed.map((c) => c.id),
	];
	return minifySwagger(ids, parsedB.doc);
}

/** Clipboard text for new/changed endpoints in B: full minified JSON or short list. */
export function buildNewChangedClipboardText(
	result: OpenApiCompareOk,
	rawJsonB: string,
	format: SwaggerCopyFormat
): string | null {
	if (format === "full") {
		return buildMinifiedNewAndChangedFromVersionB(result, rawJsonB);
	}

	const parsedB = parseOpenApiInput(rawJsonB.trim());
	if (parsedB.error || !parsedB.doc) return null;

	const ids = [
		...result.added.map((a) => a.id),
		...result.changed.map((c) => c.id),
	];
	return formatSwaggerEndpointsShort(parsedB.doc, ids);
}
