"use client";

import type { FC } from "react";
import { useState } from "react";
import { AlertTriangle, CheckCheck, GitCompare } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { SwaggerDiagnosticsPanel } from "@/components/swagger/SwaggerDiagnosticsPanel";
import type { OpenApiCompareResult } from "@/lib/openApiCompare";
import { TextDiffUnified } from "./TextDiffUnified";
import { endpointDomId, schemaDomId } from "../_lib/compareTree";

function formatJson(value: unknown): string {
	if (value === undefined) return "—";
	return JSON.stringify(value, null, 2);
}

/** "via" links shown per endpoint before collapsing the rest into a count. */
const MAX_VIA_LINKS = 8;

type SwaggerCompareResultsProps = {
	result: OpenApiCompareResult | null;
	/** Endpoint highlighted from the path tree. */
	focusedEndpointId?: string | null;
	/** Endpoints ticked for copying — owned by the panel. */
	checkedEndpointIds: ReadonlySet<string>;
	onToggleEndpoint: (endpointId: string) => void;
};

export const SwaggerCompareResults: FC<SwaggerCompareResultsProps> = ({
	result,
	focusedEndpointId,
	checkedEndpointIds,
	onToggleEndpoint,
}) => {
	const [focusedSchema, setFocusedSchema] = useState<string | null>(null);
	const [prevResult, setPrevResult] = useState(result);

	if (result !== prevResult) {
		setPrevResult(result);
		setFocusedSchema(null);
	}

	const jumpToSchema = (name: string) => {
		setFocusedSchema(name);
		document
			.getElementById(schemaDomId(name))
			?.scrollIntoView({ behavior: "smooth", block: "center" });
	};

	if (!result) {
		return (
			<EmptyState
				icon={GitCompare}
				title="No comparison yet"
				description="Select two snapshots and hit Compare to see added, removed, and changed endpoints."
			/>
		);
	}

	if (!result.ok) {
		return (
			<EmptyState
				tone="error"
				title="Couldn't compare"
				description={`${
					result.side === "b" ? "(Version B) " : result.side === "a" ? "(Version A) " : ""
				}${result.error}`}
			/>
		);
	}

	const {
		labelA,
		labelB,
		added,
		removed,
		changed,
		changedSchemas,
		diagnosticsA,
		diagnosticsB,
	} = result;

	const noDiff = added.length === 0 && removed.length === 0 && changed.length === 0;

	// An endpoint that shares its definition with another route isn't reliably
	// described by its own diff — flag it rather than let it read as a real change.
	const hasSharedDefinition = (id: string) =>
		[diagnosticsA, diagnosticsB].some((report) =>
			report.byEndpoint
				.get(id)
				?.some((issue) => issue.code === "duplicate-operation-body"),
		);

	return (
		<div className="space-y-4">
			<SwaggerDiagnosticsPanel report={diagnosticsA} label={labelA} />
			<SwaggerDiagnosticsPanel report={diagnosticsB} label={labelB} />

			{removed.length > 0 ? (
				<Section title={`Only in ${labelA}`} count={removed.length} tone="del">
					<ul className="space-y-1.5">
						{removed.map((item) => (
							<li
								key={item.id}
								id={endpointDomId(item.id)}
								className={cn(
									"scroll-mt-4 rounded-lg border border-line bg-raised/40 px-3 py-2 font-mono text-xs text-fg",
									focusedEndpointId === item.id && focusRing,
								)}
							>
								<span className="text-rose-600 dark:text-rose-300">{item.id}</span>
								{item.summary ? (
									<span className="ml-2 text-muted">{item.summary}</span>
								) : null}
							</li>
						))}
					</ul>
				</Section>
			) : null}

			{added.length > 0 ? (
				<Section title={`Only in ${labelB}`} count={added.length} tone="get">
					<ul className="space-y-1.5">
						{added.map((item) => (
							<li key={item.id} id={endpointDomId(item.id)} className="scroll-mt-4">
								<label
									className={cn(
										"flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-raised/40 px-3 py-2 font-mono text-xs text-fg",
										focusedEndpointId === item.id && focusRing,
									)}
								>
									<input
										type="checkbox"
										checked={checkedEndpointIds.has(item.id)}
										onChange={() => onToggleEndpoint(item.id)}
										className="h-4 w-4 shrink-0 rounded border-line text-accent focus:ring-accent"
									/>
									<span className="min-w-0 flex-1">
										<span className="text-emerald-600 dark:text-emerald-300">
											{item.id}
										</span>
										{item.summary ? (
											<span className="ml-2 text-muted">{item.summary}</span>
										) : null}
									</span>
								</label>
							</li>
						))}
					</ul>
				</Section>
			) : null}

			{changedSchemas.length > 0 ? (
				<Section title="Changed schemas" count={changedSchemas.length} tone="put">
					<p className="mb-2 text-xs text-muted">
						Each schema is diffed once here, with nested{" "}
						<code className="font-mono">$ref</code>s shown by name. Endpoint diffs below
						link back to the schemas behind them.
					</p>
					<ul className="space-y-3">
						{changedSchemas.map((schema) => (
							<li
								key={schema.name}
								id={schemaDomId(schema.name)}
								className={cn(
									"scroll-mt-4 overflow-hidden rounded-lg border border-line bg-surface",
									focusedSchema === schema.name && focusRing,
								)}
							>
								<div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-3 py-2 font-mono text-xs">
									<span className="text-amber-700 dark:text-amber-200">{schema.name}</span>
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
										<span
											className={cn(
												statusBadge,
												"border-rose-500/40 text-rose-600 dark:text-rose-300",
											)}
										>
											only in {labelA}
										</span>
									) : null}
									<span className="ml-auto font-sans text-[11px] text-muted">
										affects {schema.affectedEndpointIds.length} endpoint
										{schema.affectedEndpointIds.length === 1 ? "" : "s"}
									</span>
								</div>
								<div className="p-3">
									<TextDiffUnified
										labelA={labelA}
										labelB={labelB}
										oldText={formatJson(schema.left)}
										newText={formatJson(schema.right)}
									/>
								</div>
							</li>
						))}
					</ul>
				</Section>
			) : null}

			{changed.length > 0 ? (
				<Section title="Changed" count={changed.length} tone="put">
					<ul className="space-y-3">
						{changed.map((row) => (
							<li
								key={row.id}
								id={endpointDomId(row.id)}
								className={cn(
									"scroll-mt-4 overflow-hidden rounded-lg border border-line bg-surface",
									focusedEndpointId === row.id && focusRing,
								)}
							>
								<label className="flex cursor-pointer items-center gap-3 px-3 py-2 font-mono text-xs text-amber-700 dark:text-amber-200">
									<input
										type="checkbox"
										checked={checkedEndpointIds.has(row.id)}
										onChange={() => onToggleEndpoint(row.id)}
										className="h-4 w-4 shrink-0 rounded border-line text-accent focus:ring-accent"
									/>
									<span>{row.id}</span>
									{hasSharedDefinition(row.id) ? (
										<span className="inline-flex items-center gap-1 rounded border border-del/40 bg-del/10 px-1.5 py-0.5 font-sans text-[10px] font-medium text-del">
											<AlertTriangle className="h-3 w-3" aria-hidden />
											spec issue — diff may be unreliable
										</span>
									) : null}
								</label>
								{row.viaSchemas.length > 0 ? (
									<div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-1.5 text-[11px] text-muted">
										<span>{row.ownChanged ? "Also via" : "Via"}</span>
										{row.viaSchemas.slice(0, MAX_VIA_LINKS).map((name) => (
											<button
												key={name}
												type="button"
												onClick={() => jumpToSchema(name)}
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
								{row.ownChanged ? (
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
						))}
					</ul>
				</Section>
			) : null}

			{noDiff ? (
				<EmptyState
					icon={CheckCheck}
					title="No differences"
					description="The two snapshots share the same minified request/response shape."
				/>
			) : null}
		</div>
	);
};

const focusRing = "ring-2 ring-accent/60 ring-offset-2 ring-offset-base";

const statusBadge = "rounded border px-1.5 py-0.5 font-sans text-[10px] font-medium";

const toneClasses: Record<"get" | "del" | "put", string> = {
	get: "text-emerald-600 dark:text-emerald-300",
	del: "text-rose-600 dark:text-rose-300",
	put: "text-amber-700 dark:text-amber-200",
};

const Section: FC<{
	title: string;
	count: number;
	tone: "get" | "del" | "put";
	children: React.ReactNode;
}> = ({ title, count, tone, children }) => (
	<section>
		<h3 className={cn("mb-2 flex items-center gap-2 text-sm font-semibold", toneClasses[tone])}>
			{title}
			<span className="rounded-full border border-current/30 px-2 py-0.5 text-xs">
				{count}
			</span>
		</h3>
		{children}
	</section>
);
