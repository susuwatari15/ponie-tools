import type { ChangedEndpointDiff, ChangedSchemaDiff } from "@/lib/openApiCompare";
import type { CompressedSchema, MinifiedRequest } from "@/types/openapi";

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const NESTED_KEYS = new Set(["properties", "items", "additionalProperties"]);

/** `+added, −removed, ~changed` over two name-keyed maps, or null when they match. */
function diffKeyed(
	left: Record<string, unknown> | undefined,
	right: Record<string, unknown> | undefined,
): string | null {
	const a = left ?? {};
	const b = right ?? {};
	const parts: string[] = [];
	for (const name of Object.keys(b)) if (!(name in a)) parts.push(`+${name}`);
	for (const name of Object.keys(a)) if (!(name in b)) parts.push(`−${name}`);
	for (const name of Object.keys(a)) if (name in b && !same(a[name], b[name])) parts.push(`~${name}`);
	return parts.length > 0 ? parts.join(", ") : null;
}

const formatValue = (value: unknown) =>
	value === undefined ? "none" : typeof value === "string" ? value : JSON.stringify(value);

/** One-line summary of how a minified schema changed, or null when it didn't. */
export function describeSchemaDiff(
	left: CompressedSchema | undefined,
	right: CompressedSchema | undefined,
): string | null {
	if (same(left, right)) return null;
	if (!left) return "added";
	if (!right) return "removed";
	if (left.$ref !== right.$ref) {
		return `\`${formatValue(left.$ref ?? left.type)}\` → \`${formatValue(right.$ref ?? right.type)}\``;
	}

	const parts: string[] = [];
	const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
	for (const key of keys) {
		if (NESTED_KEYS.has(key)) continue;
		const a = left[key as keyof CompressedSchema];
		const b = right[key as keyof CompressedSchema];
		if (same(a, b)) continue;
		parts.push(
			key === "type" || key === "format" || key === "required"
				? `${key} ${formatValue(a)} → ${formatValue(b)}`
				: key,
		);
	}
	const fields = diffKeyed(left.properties, right.properties);
	if (fields) parts.push(`fields ${fields}`);
	const items = describeSchemaDiff(left.items, right.items);
	if (items) parts.push(`items: ${items}`);
	if (!same(left.additionalProperties, right.additionalProperties)) {
		parts.push("additionalProperties");
	}
	return parts.length > 0 ? parts.join("; ") : "changed";
}

const PARAM_LOCATIONS: { key: Exclude<keyof MinifiedRequest, "body">; label: string }[] = [
	{ key: "path", label: "Path params" },
	{ key: "query", label: "Query params" },
	{ key: "header", label: "Headers" },
	{ key: "cookie", label: "Cookies" },
];

/** The endpoint's own changes, one line per changed part. Schema-only changes are listed by the caller. */
export function describeEndpointChanges(row: ChangedEndpointDiff): string[] {
	if (!row.ownChanged) return [];
	const left = row.left ?? {};
	const right = row.right ?? {};
	const lines: string[] = [];

	if (!row.left) lines.push("Operation missing in A");
	if (!row.right) lines.push("Operation missing in B");
	if (left.summary !== right.summary) {
		lines.push(`Summary: "${left.summary ?? ""}" → "${right.summary ?? ""}"`);
	}
	if (left.description !== right.description) lines.push("Description changed");
	if (left.operationId !== right.operationId) {
		lines.push(`operationId: ${formatValue(left.operationId)} → ${formatValue(right.operationId)}`);
	}
	if (!same(left.tags, right.tags)) {
		lines.push(`Tags: ${(left.tags ?? []).join(", ") || "none"} → ${(right.tags ?? []).join(", ") || "none"}`);
	}
	if (!same(left.security, right.security)) lines.push("Security changed");

	for (const { key, label } of PARAM_LOCATIONS) {
		const diff = diffKeyed(left.request?.[key], right.request?.[key]);
		if (diff) lines.push(`${label}: ${diff}`);
	}
	const body = describeSchemaDiff(left.request?.body, right.request?.body);
	if (body) lines.push(`Request body: ${body}`);
	const response = describeSchemaDiff(left.response, right.response);
	if (response) lines.push(`Response: ${response}`);

	return lines;
}

export function describeSchemaChange(schema: ChangedSchemaDiff): string | null {
	return describeSchemaDiff(schema.left, schema.right);
}
