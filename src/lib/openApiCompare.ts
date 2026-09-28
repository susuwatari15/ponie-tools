import type { CompressedSchema, MinifiedOperation } from "../types/openapi";
import {
	buildEndpointIndex,
	getMinifiedOperationForEndpoint,
	minifySwagger,
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
import { formatSwaggerEndpointsShort, type SwaggerCopyFormat } from "./swaggerShortFormat";

export type EndpointPresence = {
	id: string;
	summary: string;
};

export type ChangedEndpointDiff = {
	id: string;
	summaryA: string;
	summaryB: string;
	/** Minified operation with `$ref`s kept as names — see `changedSchemas` for those. */
	left: MinifiedOperation | undefined;
	right: MinifiedOperation | undefined;
	/** The endpoint's own definition differs, not just a schema it references. */
	ownChanged: boolean;
	/** Changed schemas behind this endpoint's diff, sorted by name. */
	viaSchemas: string[];
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

	const summariesA = new Map(buildEndpointIndex(docA).map((e) => [e.id, e.summary]));
	const summariesB = new Map(buildEndpointIndex(docB).map((e) => [e.id, e.summary]));

	const added: EndpointPresence[] = [];
	const removed: EndpointPresence[] = [];
	const changed: ChangedEndpointDiff[] = [];

	for (const [id, summary] of summariesB) {
		if (!summariesA.has(id)) added.push({ id, summary });
	}
	for (const [id, summary] of summariesA) {
		if (!summariesB.has(id)) removed.push({ id, summary });
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

		changed.push({
			id,
			summaryA,
			summaryB: summariesB.get(id) ?? "",
			left: opA,
			right: opB,
			ownChanged: stableSerialize(opA) !== stableSerialize(opB),
			viaSchemas: [...via].sort((a, b) => a.localeCompare(b)),
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

/** Clipboard text for a hand-picked set of endpoints: full minified JSON or short list. */
export function buildEndpointsClipboardText(
	rawJson: string,
	endpointIds: string[],
	format: SwaggerCopyFormat
): string | null {
	if (endpointIds.length === 0) return null;

	const parsed = parseOpenApiInput(rawJson.trim());
	if (parsed.error || !parsed.doc) return null;

	return format === "full"
		? minifySwagger(endpointIds, parsed.doc)
		: formatSwaggerEndpointsShort(parsed.doc, endpointIds);
}
