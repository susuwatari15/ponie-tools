import { AlertTriangle, ChevronDown } from "lucide-react";
import type { FC } from "react";
import { cn } from "@/components/ui/cn";
import type { ChangedEndpointDiff, ChangedSchemaDiff } from "@/lib/openApiCompare";
import { TextDiffUnified } from "./TextDiffUnified";
import { endpointDomId, schemaDomId } from "../_lib/compareTree";

export const focusRing = "ring-2 ring-accent/60 ring-offset-2 ring-offset-base";

/** "via" links shown per endpoint before collapsing the rest into a count. */
const MAX_VIA_LINKS = 8;

const statusBadge = "rounded border px-1.5 py-0.5 font-sans text-[10px] font-medium";

function formatJson(value: unknown): string {
	if (value === undefined) return "—";
	return JSON.stringify(value, null, 2);
}

const Chevron: FC<{ open: boolean }> = ({ open }) => (
	<ChevronDown
		className={cn(
			"h-3.5 w-3.5 shrink-0 transition-transform duration-150",
			open ? "rotate-0" : "-rotate-90",
		)}
		aria-hidden
	/>
);

type ChangedSchemaRowProps = {
	schema: ChangedSchemaDiff;
	labelA: string;
	labelB: string;
	expanded: boolean;
	onToggleExpanded: () => void;
	focused: boolean;
};

export const ChangedSchemaRow: FC<ChangedSchemaRowProps> = ({
	schema,
	labelA,
	labelB,
	expanded,
	onToggleExpanded,
	focused,
}) => (
	<li
		id={schemaDomId(schema.name)}
		className={cn(
			"scroll-mt-4 overflow-hidden rounded-lg border border-line bg-surface",
			focused && focusRing,
		)}
	>
		<button
			type="button"
			onClick={onToggleExpanded}
			aria-expanded={expanded}
			className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left font-mono text-xs transition hover:bg-raised/60"
		>
			<span className="flex min-w-0 items-center gap-1.5 text-amber-700 dark:text-amber-200">
				<Chevron open={expanded} />
				<span className="truncate">{schema.name}</span>
			</span>
			{schema.status === "added" ? (
				<span
					className={cn(
						statusBadge,
						"border-emerald-500/40 text-emerald-600 dark:text-emerald-300",
					)}
				>
					only in {labelB}
				</span>
			) : schema.status === "removed" ? (
				<span className={cn(statusBadge, "border-rose-500/40 text-rose-600 dark:text-rose-300")}>
					only in {labelA}
				</span>
			) : null}
			<span className="ml-auto font-sans text-[11px] text-muted">
				affects {schema.affectedEndpointIds.length} endpoint
				{schema.affectedEndpointIds.length === 1 ? "" : "s"}
			</span>
		</button>
		{expanded ? (
			<div className="border-t border-line p-3">
				<TextDiffUnified
					labelA={labelA}
					labelB={labelB}
					oldText={formatJson(schema.left)}
					newText={formatJson(schema.right)}
				/>
			</div>
		) : null}
	</li>
);

type ChangedEndpointRowProps = {
	row: ChangedEndpointDiff;
	labelA: string;
	labelB: string;
	checked: boolean;
	onToggleChecked: () => void;
	expanded: boolean;
	onToggleExpanded: () => void;
	focused: boolean;
	/** Shares its definition with another route, so its diff may be unreliable. */
	sharedDefinition: boolean;
	onJumpToSchema: (schemaName: string) => void;
};

export const ChangedEndpointRow: FC<ChangedEndpointRowProps> = ({
	row,
	labelA,
	labelB,
	checked,
	onToggleChecked,
	expanded,
	onToggleExpanded,
	focused,
	sharedDefinition,
	onJumpToSchema,
}) => (
	<li
		id={endpointDomId(row.id)}
		className={cn(
			"scroll-mt-4 overflow-hidden rounded-lg border border-line bg-surface",
			focused && focusRing,
		)}
	>
		<div className="flex items-center gap-2 pr-2">
			<label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2 font-mono text-xs text-amber-700 dark:text-amber-200">
				<input
					type="checkbox"
					checked={checked}
					onChange={onToggleChecked}
					className="h-4 w-4 shrink-0 rounded border-line text-accent focus:ring-accent"
				/>
				<span className="min-w-0 break-all">{row.id}</span>
				{sharedDefinition ? (
					<span className="inline-flex shrink-0 items-center gap-1 rounded border border-del/40 bg-del/10 px-1.5 py-0.5 font-sans text-[10px] font-medium text-del">
						<AlertTriangle className="h-3 w-3" aria-hidden />
						spec issue — diff may be unreliable
					</span>
				) : null}
			</label>
			{row.ownChanged ? (
				<button
					type="button"
					onClick={onToggleExpanded}
					aria-expanded={expanded}
					className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted transition hover:bg-raised hover:text-fg"
				>
					<Chevron open={expanded} />
					{expanded ? "Hide diff" : "Show diff"}
				</button>
			) : null}
		</div>
		{row.viaSchemas.length > 0 ? (
			<div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-1.5 text-[11px] text-muted">
				<span>{row.ownChanged ? "Also via" : "Via"}</span>
				{row.viaSchemas.slice(0, MAX_VIA_LINKS).map((name) => (
					<button
						key={name}
						type="button"
						onClick={() => onJumpToSchema(name)}
						title={`Jump to the ${name} diff`}
						className="rounded border border-line bg-raised/60 px-1.5 py-0.5 font-mono text-amber-700 transition hover:border-accent hover:text-accent dark:text-amber-200"
					>
						{name}
					</button>
				))}
				{row.viaSchemas.length > MAX_VIA_LINKS ? (
					<span>+{row.viaSchemas.length - MAX_VIA_LINKS} more</span>
				) : null}
			</div>
		) : null}
		{row.ownChanged && expanded ? (
			<div className="border-t border-line p-3">
				<TextDiffUnified
					labelA={labelA}
					labelB={labelB}
					oldText={formatJson(row.left)}
					newText={formatJson(row.right)}
				/>
			</div>
		) : null}
	</li>
);
