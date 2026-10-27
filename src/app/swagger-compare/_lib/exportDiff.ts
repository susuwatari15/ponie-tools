import { format } from "date-fns";
import { toFileSlug } from "@/lib/downloadFile";
import type { EndpointPresence, OpenApiCompareOk } from "@/lib/openApiCompare";
import { parseEndpointId } from "@/lib/swaggerMinifier";
import { describeEndpointChanges, describeSchemaChange } from "./describeChanges";

export type ExportSide = {
	label: string;
	/** ISO date of the spec, when known. */
	date?: string;
	/** Where the spec came from: "snapshot", "live fetch", … */
	source: string;
};

export type ExportOptions = {
	a: ExportSide;
	b: ExportSide;
	/** Active filters, already described — the export holds only what they let through. */
	filters: string[];
	generatedAt?: Date;
};

const formatDate = (iso: string | undefined) =>
	iso ? format(new Date(iso), "yyyy-MM-dd HH:mm") : undefined;

const sideLine = (side: ExportSide) =>
	[side.label, formatDate(side.date), side.source].filter(Boolean).join(" · ");

/** `**GET** `/path``, falling back to the raw id. */
function endpointLabel(id: string): string {
	const parsed = parseEndpointId(id);
	return parsed ? `**${parsed.method.toUpperCase()}** \`${parsed.path}\`` : `\`${id}\``;
}

const withSummary = (label: string, summary: string) =>
	summary ? `${label} — ${summary.replace(/\s+/g, " ").trim()}` : label;

export function summaryLine(result: OpenApiCompareOk): string {
	return `+${result.added.length} −${result.removed.length} ~${result.changed.length}`;
}

export function toMarkdown(result: OpenApiCompareOk, opts: ExportOptions): string {
	const out: string[] = [];
	const generatedAt = opts.generatedAt ?? new Date();

	out.push(`# API diff: ${opts.a.label} → ${opts.b.label}`, "");
	out.push(`- **A (baseline):** ${sideLine(opts.a)}`);
	out.push(`- **B:** ${sideLine(opts.b)}`);
	out.push(`- **Generated:** ${format(generatedAt, "yyyy-MM-dd HH:mm")}`);
	if (opts.filters.length > 0) out.push(`- **Filters:** ${opts.filters.join("; ")}`);
	out.push("");

	const schemaNote =
		result.changedSchemas.length > 0
			? ` · ${result.changedSchemas.length} schema${result.changedSchemas.length === 1 ? "" : "s"} changed`
			: "";
	out.push(`**Summary:** \`${summaryLine(result)}\`${schemaNote}`, "");

	const presenceSection = (title: string, items: EndpointPresence[]) => {
		if (items.length === 0) return;
		out.push(`## ${title} (${items.length})`, "");
		for (const item of items) out.push(`- ${withSummary(endpointLabel(item.id), item.summary)}`);
		out.push("");
	};

	presenceSection("Added", result.added);
	presenceSection("Removed", result.removed);

	if (result.changed.length > 0) {
		out.push(`## Changed (${result.changed.length})`, "");
		for (const row of result.changed) {
			const tag = row.docsOnly ? " _(docs only)_" : "";
			out.push(`- ${withSummary(endpointLabel(row.id), row.summaryB || row.summaryA)}${tag}`);
			for (const line of describeEndpointChanges(row)) out.push(`  - ${line}`);
			if (row.viaSchemas.length > 0) {
				out.push(`  - Via schemas: ${row.viaSchemas.map((name) => `\`${name}\``).join(", ")}`);
			}
		}
		out.push("");
	}

	if (result.changedSchemas.length > 0) {
		out.push(`## Changed schemas (${result.changedSchemas.length})`, "");
		for (const schema of result.changedSchemas) {
			const status =
				schema.status === "added"
					? "only in B"
					: schema.status === "removed"
						? "only in A"
						: describeSchemaChange(schema);
			const affects = `affects ${schema.affectedEndpointIds.length} endpoint${
				schema.affectedEndpointIds.length === 1 ? "" : "s"
			}`;
			const tag = schema.docsOnly ? " _(docs only)_" : "";
			out.push(`- \`${schema.name}\` — ${[status, affects].filter(Boolean).join(" · ")}${tag}`);
		}
		out.push("");
	}

	if (result.added.length + result.removed.length + result.changed.length === 0) {
		out.push("_No differences._", "");
	}

	return out.join("\n");
}

const endpointFields = (id: string) => {
	const parsed = parseEndpointId(id);
	return { id, method: parsed?.method ?? null, path: parsed?.path ?? id };
};

const presenceJson = (item: EndpointPresence) => ({
	...endpointFields(item.id),
	summary: item.summary,
	tags: item.tags,
});

export function toJson(result: OpenApiCompareOk, opts: ExportOptions): string {
	return JSON.stringify(
		{
			a: opts.a,
			b: opts.b,
			generatedAt: (opts.generatedAt ?? new Date()).toISOString(),
			filters: opts.filters,
			summary: {
				added: result.added.length,
				removed: result.removed.length,
				changed: result.changed.length,
				changedSchemas: result.changedSchemas.length,
			},
			added: result.added.map(presenceJson),
			removed: result.removed.map(presenceJson),
			changed: result.changed.map((row) => ({
				...endpointFields(row.id),
				summary: row.summaryB || row.summaryA,
				tags: row.tags,
				ownChanged: row.ownChanged,
				docsOnly: row.docsOnly,
				changes: describeEndpointChanges(row),
				viaSchemas: row.viaSchemas,
				left: row.left ?? null,
				right: row.right ?? null,
			})),
			changedSchemas: result.changedSchemas.map((schema) => ({
				name: schema.name,
				status: schema.status,
				docsOnly: schema.docsOnly,
				change: describeSchemaChange(schema),
				affectedEndpointIds: schema.affectedEndpointIds,
				left: schema.left ?? null,
				right: schema.right ?? null,
			})),
		},
		null,
		2,
	);
}

/** `api-diff-<a>-vs-<b>.<ext>` */
export function exportFileName(opts: ExportOptions, extension: "md" | "json"): string {
	return `api-diff-${toFileSlug(opts.a.label, "a")}-vs-${toFileSlug(opts.b.label, "b")}.${extension}`;
}
