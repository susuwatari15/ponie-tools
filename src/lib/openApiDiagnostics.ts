import type {
	OpenApiDocument,
	OperationObject,
	ParameterObject,
} from "../types/openapi";
import { HTTP_METHODS } from "./swaggerMinifier";
import { findDuplicateJsonKeys } from "./jsonDuplicateKeys";

export type DiagnosticSeverity = "error" | "warning";

export type DiagnosticCode =
	| "duplicate-json-key"
	| "duplicate-operation-body"
	| "duplicate-parameter"
	| "conflicting-parameter-type"
	| "duplicate-list-value"
	| "unresolved-ref"
	| "path-param-mismatch"
	| "empty-paths";

export type OpenApiDiagnostic = {
	code: DiagnosticCode;
	severity: DiagnosticSeverity;
	/** `GET /mrp/trace`, or undefined for document-level findings. */
	endpointId?: string;
	/** One line, no trailing period. */
	title: string;
	/** What it means and what it does to the generated output. */
	detail: string;
	/** Other endpoints involved, e.g. the twin of a duplicated operation body. */
	relatedEndpointIds?: string[];
};

export type OpenApiDiagnosticsReport = {
	diagnostics: OpenApiDiagnostic[];
	errorCount: number;
	warningCount: number;
	/** Endpoint id -> its diagnostics, for inline markers in endpoint lists. */
	byEndpoint: Map<string, OpenApiDiagnostic[]>;
};

export const EMPTY_DIAGNOSTICS_REPORT: OpenApiDiagnosticsReport = {
	diagnostics: [],
	errorCount: 0,
	warningCount: 0,
	byEndpoint: new Map(),
};

/** `9 errors · 6 warnings`, or an empty string for a clean report. */
export function describeDiagnosticCounts(
	report: OpenApiDiagnosticsReport,
): string {
	const parts: string[] = [];
	if (report.errorCount > 0) {
		parts.push(`${report.errorCount} error${report.errorCount > 1 ? "s" : ""}`);
	}
	if (report.warningCount > 0) {
		parts.push(
			`${report.warningCount} warning${report.warningCount > 1 ? "s" : ""}`,
		);
	}
	return parts.join(" · ");
}

/**
 * The report as Markdown, grouped the same way the panel renders it — meant to
 * be pasted into a ticket or handed to an LLM alongside the spec.
 */
export function formatDiagnosticsMarkdown(
	report: OpenApiDiagnosticsReport,
	label?: string,
): string {
	if (report.diagnostics.length === 0) return "";

	const bullet = (diagnostic: OpenApiDiagnostic) =>
		`- **[${diagnostic.severity}] ${diagnostic.title}** — ${diagnostic.detail}`;

	const lines: string[] = [
		`## ${label ? `${label} — spec issues` : "Spec issues"}`,
		"",
		describeDiagnosticCounts(report),
	];

	const documentLevel = report.diagnostics.filter((d) => !d.endpointId);
	if (documentLevel.length > 0) {
		lines.push("", "### Document", "", ...documentLevel.map(bullet));
	}

	for (const [endpointId, diagnostics] of report.byEndpoint) {
		lines.push("", `### \`${endpointId}\``, "", ...diagnostics.map(bullet));
	}

	return `${lines.join("\n")}\n`;
}

/** Keeps a pathological spec from producing a wall of identical findings. */
const MAX_UNRESOLVED_REFS_LISTED = 10;

const LIST_FIELDS = ["tags", "produces", "consumes"] as const;

const quoteList = (values: string[]): string =>
	values.map((value) => `\`${value}\``).join(", ");

const endpointIdOf = (method: string, path: string): string =>
	`${method.toUpperCase()} ${path}`;

const refName = (ref: string): string => ref.split("/").pop() ?? ref;

/** A parameter's declared shape, for spotting duplicates that disagree. */
const parameterShape = (parameter: ParameterObject): string =>
	JSON.stringify({
		type: parameter.type ?? null,
		schema: parameter.schema ?? null,
		items: parameter.items ?? null,
		required: parameter.required ?? false,
	});

/**
 * True when an operation carries enough of its own identity that finding a
 * byte-identical twin means a generator collision rather than two genuinely
 * bare endpoints (`/health` and `/health/ready` legitimately look alike).
 */
const hasDistinguishingContent = (operation: OperationObject): boolean =>
	Boolean(
		operation.summary ||
			operation.description ||
			(operation.parameters && operation.parameters.length > 0),
	);

/** Every `$ref` string in a JSON subtree. Refs are not followed, so this terminates. */
function collectRefs(node: unknown, into: Set<string>): void {
	if (Array.isArray(node)) {
		for (const child of node) collectRefs(child, into);
		return;
	}
	if (!node || typeof node !== "object") return;

	for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
		if (key === "$ref" && typeof value === "string") into.add(value);
		else collectRefs(value, into);
	}
}

function unresolvedRefsIn(node: unknown, doc: OpenApiDocument): string[] {
	const refs = new Set<string>();
	collectRefs(node, refs);

	const unresolved: string[] = [];
	for (const ref of refs) {
		const name = refName(ref);
		if (doc.components?.schemas?.[name] ?? doc.definitions?.[name]) continue;
		unresolved.push(name);
	}
	return unresolved;
}

/**
 * Each `parameters` list is checked on its own: an operation-level parameter
 * that repeats a path-item-level one is a legal override, not a duplicate.
 */
function checkDuplicateParameters(
	endpointId: string,
	parameters: ParameterObject[] | undefined,
	push: (diagnostic: OpenApiDiagnostic) => void,
): void {
	const groups = new Map<string, ParameterObject[]>();
	for (const parameter of parameters ?? []) {
		if (!parameter?.name || !parameter.in) continue;
		const key = `${parameter.in}:${parameter.name}`;
		const group = groups.get(key);
		if (group) group.push(parameter);
		else groups.set(key, [parameter]);
	}

	for (const [, group] of groups) {
		if (group.length < 2) continue;

		const first = group[0]!;
		push({
			code: "duplicate-parameter",
			severity: "error",
			endpointId,
			title: `Duplicate ${first.in} parameter \`${first.name}\``,
			detail: `Declared ${group.length} times. OpenAPI requires each (name, location) pair to be unique — this usually means two handlers were merged into one operation.`,
		});

		const shapes = new Set(group.map(parameterShape));
		if (shapes.size > 1) {
			push({
				code: "conflicting-parameter-type",
				severity: "error",
				endpointId,
				title: `Conflicting declarations for \`${first.name}\``,
				detail: `The duplicates disagree on type or schema. The minified output keeps only the last one, so the other declaration is silently dropped.`,
			});
		}
	}
}

function checkDuplicateListValues(
	endpointId: string,
	operation: OperationObject,
	push: (diagnostic: OpenApiDiagnostic) => void,
): void {
	for (const field of LIST_FIELDS) {
		const values = operation[field];
		if (!Array.isArray(values)) continue;

		const counts = new Map<string, number>();
		for (const value of values) {
			if (typeof value !== "string") continue;
			counts.set(value, (counts.get(value) ?? 0) + 1);
		}

		const repeated = [...counts]
			.filter(([, count]) => count > 1)
			.map(([value]) => value);

		if (repeated.length > 0) {
			push({
				code: "duplicate-list-value",
				severity: "warning",
				endpointId,
				title: `Repeated \`${field}\` value${repeated.length > 1 ? "s" : ""}`,
				detail: `${quoteList(repeated)} listed more than once.`,
			});
		}

		if (field !== "tags") continue;

		const byLowercase = new Map<string, Set<string>>();
		for (const value of counts.keys()) {
			const lower = value.toLowerCase();
			const variants = byLowercase.get(lower) ?? new Set<string>();
			variants.add(value);
			byLowercase.set(lower, variants);
		}
		const caseVariants = [...byLowercase.values()].filter(
			(variants) => variants.size > 1,
		);
		if (caseVariants.length > 0) {
			push({
				code: "duplicate-list-value",
				severity: "warning",
				endpointId,
				title: "Tags differing only by case",
				detail: caseVariants
					.map((variants) => quoteList([...variants]))
					.join("; ")
					.concat(" — likely the same tag written two ways."),
			});
		}
	}

	if (!Array.isArray(operation.security)) return;

	const serialized = operation.security.map((entry) => JSON.stringify(entry));
	if (new Set(serialized).size < serialized.length) {
		push({
			code: "duplicate-list-value",
			severity: "warning",
			endpointId,
			title: "Repeated `security` requirement",
			detail: "The same security requirement is listed more than once.",
		});
	}
}

function checkPathParameters(
	endpointId: string,
	path: string,
	parameters: ParameterObject[],
	push: (diagnostic: OpenApiDiagnostic) => void,
): void {
	const templated = new Set(
		[...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]!),
	);
	const declared = new Set(
		parameters.filter((p) => p?.in === "path").map((p) => p.name),
	);

	const missing = [...templated].filter((name) => !declared.has(name));
	if (missing.length > 0) {
		push({
			code: "path-param-mismatch",
			severity: "warning",
			endpointId,
			title: `Undeclared path parameter${missing.length > 1 ? "s" : ""}`,
			detail: `${quoteList(missing)} appear${missing.length > 1 ? "" : "s"} in the URL template but ${missing.length > 1 ? "are" : "is"} not declared in \`parameters\`.`,
		});
	}

	const extra = [...declared].filter((name) => !templated.has(name));
	if (extra.length > 0) {
		push({
			code: "path-param-mismatch",
			severity: "warning",
			endpointId,
			title: `Unused path parameter${extra.length > 1 ? "s" : ""}`,
			detail: `${quoteList(extra)} ${extra.length > 1 ? "are" : "is"} declared with \`in: path\` but ${extra.length > 1 ? "do" : "does"} not appear in the URL template.`,
		});
	}
}

/**
 * Inspects a parsed OpenAPI document for issues that would otherwise corrupt
 * the minified output or the compare diff without any visible signal.
 *
 * Pass `rawJson` to also run the checks that only the source text can answer.
 */
export function collectOpenApiDiagnostics(
	doc: OpenApiDocument,
	rawJson?: string,
): OpenApiDiagnosticsReport {
	const diagnostics: OpenApiDiagnostic[] = [];
	const push = (diagnostic: OpenApiDiagnostic) => diagnostics.push(diagnostic);

	if (rawJson) {
		for (const duplicate of findDuplicateJsonKeys(rawJson)) {
			push({
				code: "duplicate-json-key",
				severity: "error",
				title: `Duplicate JSON key \`${duplicate.key}\``,
				detail: `Line ${duplicate.line} repeats a key first seen on line ${duplicate.firstLine}${duplicate.pointer ? ` (inside \`${duplicate.pointer}\`)` : ""}. Only the last value survives parsing — the earlier one is already lost.`,
			});
		}
	}

	// Walk once: collect operations for the cross-endpoint checks while running
	// the per-operation ones.
	const bodies = new Map<string, string[]>();
	let operationCount = 0;

	for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
		if (!pathItem || typeof pathItem !== "object") continue;

		for (const method of HTTP_METHODS) {
			const operation = pathItem[method];
			if (!operation) continue;

			operationCount += 1;
			const endpointId = endpointIdOf(method, path);

			checkDuplicateParameters(endpointId, pathItem.parameters, push);
			checkDuplicateParameters(endpointId, operation.parameters, push);
			checkDuplicateListValues(endpointId, operation, push);
			checkPathParameters(
				endpointId,
				path,
				[...(pathItem.parameters ?? []), ...(operation.parameters ?? [])],
				push,
			);

			const unresolved = unresolvedRefsIn(operation, doc);
			if (unresolved.length > 0) {
				const listed = unresolved.slice(0, MAX_UNRESOLVED_REFS_LISTED);
				push({
					code: "unresolved-ref",
					severity: "warning",
					endpointId,
					title: `Unresolved schema reference${unresolved.length > 1 ? "s" : ""}`,
					detail: `${quoteList(listed)}${unresolved.length > listed.length ? `, +${unresolved.length - listed.length} more` : ""} not found in \`components.schemas\` or \`definitions\`. These stay as bare \`$ref\` names in the output instead of being expanded.`,
				});
			}

			if (hasDistinguishingContent(operation)) {
				const key = JSON.stringify(operation);
				const group = bodies.get(key);
				if (group) group.push(endpointId);
				else bodies.set(key, [endpointId]);
			}
		}
	}

	for (const [, group] of bodies) {
		if (group.length < 2) continue;
		for (const endpointId of group) {
			push({
				code: "duplicate-operation-body",
				severity: "error",
				endpointId,
				title: "Identical to another endpoint",
				detail: `Byte-for-byte the same definition as ${quoteList(group.filter((id) => id !== endpointId))}. Different routes should not share one operation — the spec generator most likely merged two handlers, so at least one of these endpoints is described wrongly.`,
				relatedEndpointIds: group.filter((id) => id !== endpointId),
			});
		}
	}

	if (operationCount === 0) {
		push({
			code: "empty-paths",
			severity: "warning",
			title: "No endpoints found",
			detail: "`paths` is present but contains no operations.",
		});
	}

	const byEndpoint = new Map<string, OpenApiDiagnostic[]>();
	let errorCount = 0;
	let warningCount = 0;

	for (const diagnostic of diagnostics) {
		if (diagnostic.severity === "error") errorCount += 1;
		else warningCount += 1;

		if (!diagnostic.endpointId) continue;
		const existing = byEndpoint.get(diagnostic.endpointId);
		if (existing) existing.push(diagnostic);
		else byEndpoint.set(diagnostic.endpointId, [diagnostic]);
	}

	return { diagnostics, errorCount, warningCount, byEndpoint };
}
