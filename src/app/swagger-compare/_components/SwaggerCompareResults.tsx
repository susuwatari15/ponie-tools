"use client";

import type { FC } from "react";
import { CheckCheck, FilterX, GitCompare } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { SwaggerDiagnosticsPanel } from "@/components/swagger/SwaggerDiagnosticsPanel";
import type { OpenApiCompareOk, OpenApiCompareResult } from "@/lib/openApiCompare";
import { endpointDomId } from "../_lib/compareTree";
import {
	endpointKey,
	expandableKeys,
	schemaKey,
	useCompareResultsView,
	type FocusRequest,
	type ResultSection,
} from "../_hooks/useCompareResultsView";
import { CompareResultSection } from "./CompareResultSection";
import { ChangedEndpointRow, ChangedSchemaRow, focusRing } from "./CompareResultRows";

type SwaggerCompareResultsProps = {
	/** What is shown — the comparison narrowed by the active filters. */
	result: OpenApiCompareResult | null;
	/** The unfiltered comparison, for section totals; also resets the view when it changes. */
	unfiltered: OpenApiCompareOk | null;
	onClearFilters: () => void;
	/** Endpoint picked in the path tree — paged in, expanded and scrolled to. */
	focusRequest: FocusRequest | null;
	/** Endpoints ticked for copying — owned by the panel. */
	checkedEndpointIds: ReadonlySet<string>;
	onToggleEndpoint: (endpointId: string) => void;
};

export const SwaggerCompareResults: FC<SwaggerCompareResultsProps> = ({
	result,
	unfiltered,
	onClearFilters,
	focusRequest,
	checkedEndpointIds,
	onToggleEndpoint,
}) => {
	const view = useCompareResultsView(result, focusRequest, unfiltered ?? result);

	if (!result) {
		return (
			<EmptyState
				icon={GitCompare}
				title="No comparison yet"
				description="Pick a baseline (A) and a version to compare against (B) — a saved snapshot, a live fetch, pasted JSON or the Minifier's spec — then hit Compare."
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
	const allHidden =
		noDiff &&
		unfiltered !== null &&
		unfiltered.added.length + unfiltered.removed.length + unfiltered.changed.length > 0;

	// An endpoint that shares its definition with another route isn't reliably
	// described by its own diff — flag it rather than let it read as a real change.
	const hasSharedDefinition = (id: string) =>
		[diagnosticsA, diagnosticsB].some((report) =>
			report.byEndpoint
				.get(id)
				?.some((issue) => issue.code === "duplicate-operation-body"),
		);

	const sectionTotals: Record<ResultSection, number | undefined> = {
		removed: unfiltered?.removed.length,
		added: unfiltered?.added.length,
		schemas: unfiltered?.changedSchemas.length,
		changed: unfiltered?.changed.length,
	};

	const paging = (section: ResultSection, count: number) => {
		const { start, end } = view.rowWindow(section);
		return {
			count,
			total: sectionTotals[section],
			start: Math.min(start, count),
			end: Math.min(end, count),
			onShowPrevious: () => view.showPrevious(section),
			onShowNext: () => view.showNext(section),
			onShowAll: () => view.showAll(section),
		};
	};

	/** The rows of a section inside its current window. */
	const windowed = <T,>(section: ResultSection, rows: T[]): T[] => {
		const { start, end } = view.rowWindow(section);
		return rows.slice(start, end);
	};

	const expandControls = (section: "schemas" | "changed") => {
		const keys = expandableKeys(result, section);
		if (keys.length === 0) return {};
		return {
			onExpandAll: () => view.setKeysExpanded(keys, true),
			onCollapseAll: () => view.setKeysExpanded(keys, false),
		};
	};

	return (
		<div className="space-y-4">
			<SwaggerDiagnosticsPanel report={diagnosticsA} label={labelA} />
			<SwaggerDiagnosticsPanel report={diagnosticsB} label={labelB} />

			{removed.length > 0 ? (
				<CompareResultSection
					title={`Only in ${labelA}`}
					tone="del"
					{...paging("removed", removed.length)}
				>
					<ul className="space-y-1.5">
						{windowed("removed", removed).map((item) => (
							<li
								key={item.id}
								id={endpointDomId(item.id)}
								className={cn(
									"scroll-mt-4 rounded-lg border border-line bg-raised/40 px-3 py-2 font-mono text-xs text-fg",
									view.isFocused(endpointKey(item.id)) && focusRing,
								)}
							>
								<span className="text-rose-600 dark:text-rose-300">{item.id}</span>
								{item.summary ? (
									<span className="ml-2 text-muted">{item.summary}</span>
								) : null}
							</li>
						))}
					</ul>
				</CompareResultSection>
			) : null}

			{added.length > 0 ? (
				<CompareResultSection
					title={`Only in ${labelB}`}
					tone="get"
					{...paging("added", added.length)}
				>
					<ul className="space-y-1.5">
						{windowed("added", added).map((item) => (
							<li key={item.id} id={endpointDomId(item.id)} className="scroll-mt-4">
								<label
									className={cn(
										"flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-raised/40 px-3 py-2 font-mono text-xs text-fg",
										view.isFocused(endpointKey(item.id)) && focusRing,
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
				</CompareResultSection>
			) : null}

			{changedSchemas.length > 0 ? (
				<CompareResultSection
					title="Changed schemas"
					tone="put"
					description={
						<>
							Each schema is diffed once here, with nested{" "}
							<code className="font-mono">$ref</code>s shown by name. Endpoint diffs below
							link back to the schemas behind them.
						</>
					}
					{...paging("schemas", changedSchemas.length)}
					{...expandControls("schemas")}
				>
					<ul className="space-y-2">
						{windowed("schemas", changedSchemas).map((schema) => (
							<ChangedSchemaRow
								key={schema.name}
								schema={schema}
								labelA={labelA}
								labelB={labelB}
								expanded={view.isExpanded(schemaKey(schema.name))}
								onToggleExpanded={() => view.toggleExpanded(schemaKey(schema.name))}
								focused={view.isFocused(schemaKey(schema.name))}
							/>
						))}
					</ul>
				</CompareResultSection>
			) : null}

			{changed.length > 0 ? (
				<CompareResultSection
					title="Changed"
					tone="put"
					{...paging("changed", changed.length)}
					{...expandControls("changed")}
				>
					<ul className="space-y-2">
						{windowed("changed", changed).map((row) => (
							<ChangedEndpointRow
								key={row.id}
								row={row}
								labelA={labelA}
								labelB={labelB}
								checked={checkedEndpointIds.has(row.id)}
								onToggleChecked={() => onToggleEndpoint(row.id)}
								expanded={view.isExpanded(endpointKey(row.id))}
								onToggleExpanded={() => view.toggleExpanded(endpointKey(row.id))}
								focused={view.isFocused(endpointKey(row.id))}
								sharedDefinition={hasSharedDefinition(row.id)}
								onJumpToSchema={(name) => view.reveal(schemaKey(name))}
							/>
						))}
					</ul>
				</CompareResultSection>
			) : null}

			{allHidden ? (
				<EmptyState
					icon={FilterX}
					title="Nothing matches the filters"
					description="Every difference is hidden by the active filters."
					action={
						<button
							type="button"
							onClick={onClearFilters}
							className="text-xs font-medium text-accent hover:underline"
						>
							Clear filters
						</button>
					}
				/>
			) : noDiff ? (
				<EmptyState
					icon={CheckCheck}
					title="No differences"
					description="Both specs share the same minified request/response shape."
				/>
			) : null}
		</div>
	);
};
