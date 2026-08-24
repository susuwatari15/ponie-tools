"use client";

import type { FC } from "react";
import { AlertTriangle, CheckCheck, GitCompare } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { SwaggerDiagnosticsPanel } from "@/components/swagger/SwaggerDiagnosticsPanel";
import type { MinifiedOperation } from "@/types/openapi";
import type { OpenApiCompareResult } from "@/lib/openApiCompare";
import { TextDiffUnified } from "./TextDiffUnified";
import { endpointDomId } from "../_lib/compareTree";

function formatOp(op: MinifiedOperation | undefined): string {
	if (!op) return "—";
	return JSON.stringify(op, null, 2);
}

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

	const { labelA, labelB, added, removed, changed, diagnosticsA, diagnosticsB } =
		result;

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
								<label className="flex cursor-pointer items-center gap-3 border-b border-line px-3 py-2 font-mono text-xs text-amber-700 dark:text-amber-200">
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
								<div className="p-3">
									<TextDiffUnified
										labelA={labelA}
										labelB={labelB}
										oldText={formatOp(row.left)}
										newText={formatOp(row.right)}
									/>
								</div>
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
