import type { CompressedSchema, EndpointItem, MinifiedOperation } from "../types/openapi";
import {
	buildEndpointIndex,
	getMinifiedOperationForEndpoint,
	minifySwaggerObject,
} from "./swaggerMinifier";
import {
	collectOpenApiDiagnostics,
	type OpenApiDiagnosticsReport,
} from "./openApiDiagnostics";
import { parseOpenApiInput } from "./openApiInput";
import {
	collectOperationRefs,
	createIntern,
	indexSchemas,
	SHALLOW,
	type SchemaIndex,
} from "./openApiSchemaIndex";

/** `full` = pretty-printed JSON, `minified` = compact single-line JSON. */
export type SwaggerCopyFormat = "full" | "minified";

export type EndpointPresence = {
	id: string;
	summary: string;
	tags: string[];
};

export type ChangedEndpointDiff = {
	id: string;
	summaryA: string;
	summaryB: string;
	/** Tags from both versions, deduplicated. */
	tags: string[];
	/** Minified operation with `$ref`s kept as names — see `changedSchemas` for those. */
	left: MinifiedOperation | undefined;
	right: MinifiedOperation | undefined;
	/** The endpoint's own definition differs, not just a schema it references. */
	ownChanged: boolean;
	/** Changed schemas behind this endpoint's diff, sorted by name. */
	viaSchemas: string[];
	/** Only `summary` / `description` / `example(s)` differ, here and in every schema behind it. */
	docsOnly: boolean;
};

export type SchemaChangeStatus = "added" | "removed" | "changed";

export type ChangedSchemaDiff = {
	name: string;
	status: SchemaChangeStatus;
	/** Minified schema with nested `$ref`s kept as names. */
	left: CompressedSchema | undefined;
	right: CompressedSchema | undefined;
	/** Changed endpoints whose diff this schema contributes to. */
	affectedEndpointIds: string[];
	/** Only `description` / `example(s)` differ. */
	docsOnly: boolean;
};

export type OpenApiCompareResult =
	| {
			ok: true;
			labelA: string;
			labelB: string;
			added: EndpointPresence[];
			removed: EndpointPresence[];
			changed: ChangedEndpointDiff[];
			/** Schemas whose own definition changed, most-affecting first. */
			changedSchemas: ChangedSchemaDiff[];
			diagnosticsA: OpenApiDiagnosticsReport;
			diagnosticsB: OpenApiDiagnosticsReport;
	  }
	| {
			ok: false;
			error: string;
			side?: "a" | "b";
	  };

export type OpenApiCompareOk = Extract<OpenApiCompareResult, { ok: true }>;

function stableSerialize(value: unknown): string {
	return JSON.stringify(value ?? null);
}

const DOC_KEYS = new Set(["description", "summary", "example", "examples"]);

/**
 * Copy of a minified schema without its documentation keys. Walks the shape
 * structurally, so a property *named* `description` is kept.
 */
function stripSchemaDocs(schema: CompressedSchema | undefined): unknown {
	if (!schema || typeof schema !== "object") return schema;
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(schema)) {
		if (DOC_KEYS.has(key)) continue;
		if (key === "properties" && value && typeof value === "object") {
			out[key] = Object.fromEntries(
				Object.entries(value as Record<string, CompressedSchema>).map(([name, child]) => [
					name,
					stripSchemaDocs(child),
				]),
			);
		} else if ((key === "items" || key === "additionalProperties") && typeof value === "object") {
			out[key] = stripSchemaDocs(value as CompressedSchema);
		} else {
			out[key] = value;
		}
	}
	return out;
}

function stripOperationDocs(op: MinifiedOperation | undefined): unknown {
	if (!op) return op;
	const { request, response, ...rest } = op;
	delete rest.summary;
	delete rest.description;
	const strippedRequest = request
		? Object.fromEntries(
				Object.entries(request).map(([location, value]) => [
					location,
					location === "body"
						? stripSchemaDocs(value as CompressedSchema)
						: Object.fromEntries(
								Object.entries(value as Record<string, CompressedSchema>).map(
									([name, param]) => [name, stripSchemaDocs(param)],
								),
							),
				]),
			)
		: undefined;
	return { ...rest, request: strippedRequest, response: stripSchemaDocs(response) };
}

const tagsOf = (endpoints: EndpointItem[]) => new Map(endpoints.map((e) => [e.id, e.tags]));

/**
 * For each schema whose inlined form changed, the root-cause schemas (own
 * definition changed) it reaches without passing through an unchanged schema.
 * Edges from both versions are used: a ref that exists on one side only sits in
 * a schema whose own definition changed, so the union never over-reports.
 */
function changeCauses(
	indexA: SchemaIndex,
	indexB: SchemaIndex,
	effective: Set<string>,
	rootCauses: string[],
): Map<string, Set<string>> {
	const referencedBy = new Map<string, Set<string>>();
	for (const index of [indexA, indexB]) {
		for (const [parent, children] of index.refs) {
			if (!effective.has(parent)) continue;
			for (const child of children) {
				const parents = referencedBy.get(child) ?? new Set<string>();
				parents.add(parent);
				referencedBy.set(child, parents);
			}
		}
	}

	const causes = new Map<string, Set<string>>();
	for (const cause of rootCauses) {
		const visited = new Set<string>([cause]);
		const queue = [cause];
		while (queue.length > 0) {
			const name = queue.pop()!;
			const reached = causes.get(name) ?? new Set<string>();
			reached.add(cause);
			causes.set(name, reached);
			for (const parent of referencedBy.get(name) ?? []) {
				if (visited.has(parent)) continue;
				visited.add(parent);
				queue.push(parent);
			}
		}
	}
	return causes;
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

	const docA = parsedA.doc;
	const docB = parsedB.doc;

	const endpointsA = buildEndpointIndex(docA);
	const endpointsB = buildEndpointIndex(docB);
	const summariesA = new Map(endpointsA.map((e) => [e.id, e.summary]));
	const summariesB = new Map(endpointsB.map((e) => [e.id, e.summary]));
	const tagsA = tagsOf(endpointsA);
	const tagsB = tagsOf(endpointsB);

	const added: EndpointPresence[] = [];
	const removed: EndpointPresence[] = [];
	const changed: ChangedEndpointDiff[] = [];

	for (const [id, summary] of summariesB) {
		if (!summariesA.has(id)) added.push({ id, summary, tags: tagsB.get(id) ?? [] });
	}
	for (const [id, summary] of summariesA) {
		if (!summariesB.has(id)) removed.push({ id, summary, tags: tagsA.get(id) ?? [] });
	}

	// Each named schema is minified and fingerprinted once per side; endpoints
	// are then compared by fingerprint instead of by their fully inlined JSON.
	const intern = createIntern();
	const indexA = indexSchemas(docA, intern);
	const indexB = indexSchemas(docB, intern);

	const schemaNames = new Set([...indexA.shallow.keys(), ...indexB.shallow.keys()]);
	const effective = new Set(
		[...schemaNames].filter((name) => indexA.fingerprint(name) !== indexB.fingerprint(name)),
	);
	const rootCauses = [...effective].filter(
		(name) => indexA.serialized.get(name) !== indexB.serialized.get(name),
	);
	const causes = changeCauses(indexA, indexB, effective, rootCauses);
	const affected = new Map<string, string[]>();
	// A schema present on one side only is a real change, even if it is undocumented.
	const schemaDocsOnly = new Map(
		rootCauses.map((name) => {
			const left = indexA.shallow.get(name);
			const right = indexB.shallow.get(name);
			return [
				name,
				left !== undefined &&
					right !== undefined &&
					stableSerialize(stripSchemaDocs(left)) === stableSerialize(stripSchemaDocs(right)),
			];
		}),
	);

	for (const [id, summaryA] of summariesA) {
		if (!summariesB.has(id)) continue;

		const opA = getMinifiedOperationForEndpoint(id, docA, SHALLOW);
		const opB = getMinifiedOperationForEndpoint(id, docB, SHALLOW);
		if (indexA.fingerprintOperation(opA) === indexB.fingerprintOperation(opB)) continue;

		const refs = new Set<string>();
		collectOperationRefs(opA, refs);
		collectOperationRefs(opB, refs);
		const via = new Set<string>();
		for (const ref of refs) {
			for (const cause of causes.get(ref) ?? []) via.add(cause);
		}
		for (const cause of via) {
			const ids = affected.get(cause) ?? [];
			ids.push(id);
			affected.set(cause, ids);
		}

		const ownChanged = stableSerialize(opA) !== stableSerialize(opB);
		const ownDocsOnly =
			!ownChanged ||
			stableSerialize(stripOperationDocs(opA)) === stableSerialize(stripOperationDocs(opB));
		changed.push({
			id,
			summaryA,
			summaryB: summariesB.get(id) ?? "",
			tags: [...new Set([...(tagsA.get(id) ?? []), ...(tagsB.get(id) ?? [])])],
			left: opA,
			right: opB,
			ownChanged,
			viaSchemas: [...via].sort((a, b) => a.localeCompare(b)),
			docsOnly:
				(ownChanged || via.size > 0) &&
				ownDocsOnly &&
				[...via].every((name) => schemaDocsOnly.get(name) === true),
		});
	}

	// Only schemas that explain an endpoint diff: a change no shared endpoint
	// can see (unused, or renamed to an identical copy) isn't a difference here.
	const changedSchemas: ChangedSchemaDiff[] = [...affected]
		.map(([name, affectedEndpointIds]) => ({
			name,
			status: !indexA.shallow.has(name)
				? ("added" as const)
				: !indexB.shallow.has(name)
					? ("removed" as const)
					: ("changed" as const),
			left: indexA.shallow.get(name),
			right: indexB.shallow.get(name),
			affectedEndpointIds,
			docsOnly: schemaDocsOnly.get(name) === true,
		}))
		.sort(
			(a, b) =>
				b.affectedEndpointIds.length - a.affectedEndpointIds.length ||
				a.name.localeCompare(b.name),
		);

	return {
		ok: true,
		labelA: options.labelA,
		labelB: options.labelB,
		added,
		removed,
		changed,
		changedSchemas,
		diagnosticsA: collectOpenApiDiagnostics(docA, rawA),
		diagnosticsB: collectOpenApiDiagnostics(docB, rawB),
	};
}

/** Clipboard text for a hand-picked set of endpoints: pretty or compact minified JSON. */
export function buildEndpointsClipboardText(
	rawJson: string,
	endpointIds: string[],
	format: SwaggerCopyFormat
): string | null {
	if (endpointIds.length === 0) return null;

	const parsed = parseOpenApiInput(rawJson.trim());
	if (parsed.error || !parsed.doc) return null;

	const minified = minifySwaggerObject(endpointIds, parsed.doc);
	return format === "full"
		? JSON.stringify(minified, null, 2)
		: JSON.stringify(minified);
}
