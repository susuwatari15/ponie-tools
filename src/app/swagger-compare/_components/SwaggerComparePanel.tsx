"use client";

import { Copy, GitCompare, Loader2 } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/components/ui/cn";
import type { SideKey } from "../_lib/compareSources";
import type { SwaggerCompareController } from "../_hooks/useSwaggerCompare";
import { CompareExportMenu } from "./CompareExportMenu";
import { CompareFilterBar } from "./CompareFilterBar";
import { CompareSourcePicker } from "./CompareSourcePicker";
import { SwaggerCompareResults } from "./SwaggerCompareResults";
import { SwaggerCompareTree } from "./SwaggerCompareTree";
import { SwaggerSnapshotList } from "./SwaggerSnapshotList";

type SwaggerComparePanelProps = {
	m: SwaggerCompareController;
	className?: string;
};

export const SwaggerComparePanel: FC<SwaggerComparePanelProps> = ({ m, className }) => {
	const unfiltered = m.compareResult?.ok ? m.compareResult : null;
	const hasDiff =
		unfiltered !== null &&
		unfiltered.added.length + unfiltered.removed.length + unfiltered.changed.length > 0;
	const shownCount = m.filteredResult
		? m.filteredResult.added.length + m.filteredResult.removed.length + m.filteredResult.changed.length
		: 0;

	const picker = (key: SideKey) => {
		const side = key === "a" ? m.sideA : m.sideB;
		const other = key === "a" ? m.sideB : m.sideA;
		const resolved = m.resolved?.[key];
		return (
			<CompareSourcePicker
				sideKey={key}
				side={side}
				onChange={(patch) => m.updateSide(key, patch)}
				snapshots={m.snapshots}
				otherSnapshotId={other.kind === "snapshot" ? other.snapshotId : ""}
				profiles={m.profiles}
				extensionAvailable={m.extensionAvailable}
				minifierSize={m.minifierSize}
				onSaveAsSnapshot={
					resolved && resolved.kind !== "snapshot" ? () => void m.saveSideAsSnapshot(key) : undefined
				}
			/>
		);
	};

	return (
		<div
			className={cn(
				"grid grid-cols-1 gap-4 lg:grid-cols-[minmax(15rem,1fr)_minmax(0,4fr)] lg:grid-rows-1",
				className,
			)}
		>
			{/* Saved snapshots */}
			<div className="flex min-h-0 flex-col gap-2">
				<p className="font-mono text-[10px] uppercase tracking-widest text-muted">
					// saved snapshots
				</p>
				<SwaggerSnapshotList m={m} />
			</div>

			{/* Compare */}
			<div className="flex min-h-0 min-w-0 flex-col gap-3 sm:gap-5">
				<Card className="p-3 sm:p-4">
					<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
						{picker("a")}
						{picker("b")}
					</div>

					<div className="mt-3 flex flex-wrap items-center gap-1.5">
						<Button
							size="sm"
							variant="primary"
							onClick={() => void m.compare()}
							disabled={!m.canCompare || m.comparing}
							aria-busy={m.comparing}
							leftIcon={<GitCompare className="h-3.5 w-3.5" />}
						>
							{m.comparing ? "Comparing…" : "Compare"}
						</Button>
						<Button
							size="sm"
							disabled={!m.canCopySelected}
							onClick={() => void m.copySelected("full")}
							title="Copy the selected endpoints from B as pretty-printed JSON"
							leftIcon={<Copy className="h-3.5 w-3.5" />}
						>
							JSON
						</Button>
						<Button
							size="sm"
							disabled={!m.canCopySelected}
							onClick={() => void m.copySelected("minified")}
							title="Copy the selected endpoints from B as compact single-line JSON"
							leftIcon={<Copy className="h-3.5 w-3.5" />}
						>
							Copy Minified
						</Button>
						{m.selectableIds.length > 0 ? (
							<span className="flex items-center gap-2 text-xs text-muted">
								<span className="whitespace-nowrap">
									<span className="font-mono text-accent">{m.selectedShownIds.length}</span>/
									{m.selectableIds.length}
								</span>
								<button
									type="button"
									onClick={() => m.setEndpointsSelected(m.selectableIds, true)}
									className="font-medium text-accent hover:underline"
								>
									All
								</button>
								<span className="text-line">|</span>
								<button
									type="button"
									onClick={m.clearSelection}
									className="font-medium text-accent hover:underline"
								>
									Clear
								</button>
							</span>
						) : null}
					</div>
					{m.selectableIds.length > 0 ? (
						<p className="mt-2 hidden text-xs text-muted lg:block">
							Tick endpoints in the path tree or the results below, then copy them. Endpoints only
							in <span className="font-mono text-rose-500">A</span> can&apos;t be copied — they no
							longer exist in B.
						</p>
					) : null}
				</Card>

				<div className="flex min-h-0 flex-1 flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<p className="font-mono text-[10px] uppercase tracking-widest text-muted">
							// results
							{m.filtering && hasDiff ? (
								<span className="ml-2 normal-case tracking-normal text-accent">
									{shownCount} shown
								</span>
							) : null}
						</p>
						{unfiltered ? <CompareExportMenu m={m} /> : null}
					</div>
					{hasDiff ? <CompareFilterBar m={m} /> : null}
					<div
						className={cn(
							"grid min-h-0 flex-1 grid-cols-1 gap-2",
							shownCount > 0 && "lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]",
						)}
					>
						{shownCount > 0 ? (
							<SwaggerCompareTree
								className="max-h-72 lg:max-h-none"
								result={m.filteredResult}
								selectedEndpointId={m.focus?.endpointId ?? null}
								onSelectEndpoint={m.focusEndpoint}
								checkedEndpointIds={m.selectedIds}
								onToggleEndpoint={m.toggleEndpoint}
								onSetEndpointsChecked={m.setEndpointsSelected}
							/>
						) : null}
						<div className="scroll-ide min-h-0 flex-1 overflow-y-auto pr-1">
							{m.comparing ? (
								<EmptyState
									icon={Loader2}
									title="Comparing…"
									description="Reading both specs and diffing them."
								/>
							) : (
								<SwaggerCompareResults
									result={m.filteredResult ?? m.compareResult}
									unfiltered={unfiltered}
									onClearFilters={m.filterActions.reset}
									focusRequest={m.focus}
									checkedEndpointIds={m.selectedIds}
									onToggleEndpoint={m.toggleEndpoint}
								/>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
