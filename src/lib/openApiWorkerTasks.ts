import type { EndpointItem, OpenApiDocument } from "../types/openapi";
import { compareOpenApiRawJson, type OpenApiCompareResult } from "./openApiCompare";
import { parseOpenApiInput } from "./openApiInput";
import {
	buildEndpointIndex,
	minifySwaggerWithOptions,
	type MinifyOptions,
} from "./swaggerMinifier";
import { estimateSize, type SizeEstimate } from "./tokenEstimate";

/**
 * Specs at least this long (in characters, ~bytes) are indexed, minified and
 * compared in the Web Worker. Below it the work takes a few milliseconds, so
 * the synchronous path is kept: it has no round trip and no stale frame.
 */
export const OPENAPI_WORKER_MIN_CHARS = 256 * 1024;

export const shouldRunOffThread = (chars: number) => chars >= OPENAPI_WORKER_MIN_CHARS;

export type OpenApiDocIndex = {
	endpoints: EndpointItem[];
	/** The whole spec as compact JSON — the baseline the output size is compared with. */
	fullSpecSize: SizeEstimate;
};

export type MinifiedOutput = {
	/** Pretty-printed JSON. */
	output: string;
	/** Single-line JSON — what "Copy Minified" puts on the clipboard. */
	compact: string;
	size: SizeEstimate;
};

export function indexOpenApiDoc(doc: OpenApiDocument): OpenApiDocIndex {
	return {
		endpoints: buildEndpointIndex(doc),
		fullSpecSize: estimateSize(JSON.stringify(doc)),
	};
}

export function minifyOpenApiDoc(
	doc: OpenApiDocument,
	endpointIds: string[],
	options: MinifyOptions,
): MinifiedOutput {
	const spec = minifySwaggerWithOptions(endpointIds, doc, options);
	const compact = JSON.stringify(spec);
	return { output: JSON.stringify(spec, null, 2), compact, size: estimateSize(compact) };
}

/**
 * The jobs the worker runs. Requests carry the raw spec text rather than a
 * parsed document: posting a string is a cheap copy, while structured-cloning
 * a parsed 5 MB spec would block the main thread for about as long as parsing it.
 */
export type OpenApiTasks = {
	index: { request: { rawJson: string }; result: OpenApiDocIndex };
	minify: {
		request: { rawJson: string; endpointIds: string[]; options: MinifyOptions };
		result: MinifiedOutput;
	};
	compare: {
		request: { rawA: string; rawB: string; labelA: string; labelB: string };
		result: OpenApiCompareResult;
	};
};

export type OpenApiTaskKind = keyof OpenApiTasks;
export type OpenApiTaskRequest<K extends OpenApiTaskKind> = OpenApiTasks[K]["request"];
export type OpenApiTaskResult<K extends OpenApiTaskKind> = OpenApiTasks[K]["result"];

/** Main thread → worker. */
export type OpenApiWorkerMessage<K extends OpenApiTaskKind = OpenApiTaskKind> = {
	id: number;
	kind: K;
	request: OpenApiTaskRequest<K>;
};

/** Worker → main thread, matched to its message by `id`. */
export type OpenApiWorkerReply =
	{ id: number; ok: true; result: unknown } | { id: number; ok: false; error: string };

export type OpenApiTaskRunner = <K extends OpenApiTaskKind>(
	kind: K,
	request: OpenApiTaskRequest<K>,
) => OpenApiTaskResult<K>;

/**
 * Runs tasks against the pure `src/lib` functions — inside the worker, or on
 * the main thread when workers are unavailable. The last parsed spec is kept,
 * so re-minifying the same text skips `JSON.parse`.
 */
export function createOpenApiTaskRunner(): OpenApiTaskRunner {
	let cached: { rawJson: string; doc: OpenApiDocument } | null = null;

	const docFor = (rawJson: string): OpenApiDocument => {
		if (cached?.rawJson !== rawJson) {
			const parsed = parseOpenApiInput(rawJson);
			if (!parsed.doc) throw new Error(parsed.error || "Invalid OpenAPI JSON.");
			cached = { rawJson, doc: parsed.doc };
		}
		return cached.doc;
	};

	const tasks: {
		[K in OpenApiTaskKind]: (request: OpenApiTaskRequest<K>) => OpenApiTaskResult<K>;
	} = {
		index: ({ rawJson }) => indexOpenApiDoc(docFor(rawJson)),
		minify: ({ rawJson, endpointIds, options }) =>
			minifyOpenApiDoc(docFor(rawJson), endpointIds, options),
		compare: ({ rawA, rawB, labelA, labelB }) =>
			compareOpenApiRawJson(rawA, rawB, { labelA, labelB }),
	};

	return (kind, request) => tasks[kind](request);
}
