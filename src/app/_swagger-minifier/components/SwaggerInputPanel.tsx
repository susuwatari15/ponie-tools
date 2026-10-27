import type { FC } from "react";
import { GitCompare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { SwaggerDiagnosticsPanel } from "@/components/swagger/SwaggerDiagnosticsPanel";
import type { SwaggerMinifierController } from "../hooks/useSwaggerMinifier";
import { SwaggerEndpointList } from "./SwaggerEndpointList";
import { SwaggerEndpointSearch } from "./SwaggerEndpointSearch";
import { SwaggerInputModeToggle } from "./SwaggerInputModeToggle";
import { SwaggerManualJsonInput } from "./SwaggerManualJsonInput";
import { SwaggerParseStatus } from "./SwaggerParseStatus";
import { SwaggerPresetMenu } from "./SwaggerPresetMenu";
import { SwaggerUrlFetchForm } from "./SwaggerUrlFetchForm";

type SwaggerInputPanelProps = {
	m: SwaggerMinifierController;
	className?: string;
	onSnapshotSaved?: () => void;
	onNavigateToCompareLatest?: () => void;
};

const panelClass = "flex min-h-[560px] max-h-full flex-col overflow-auto lg:min-h-0";

/** Stands in for the input + endpoint list while IndexedDB hydrates. */
const InputPanelSkeleton: FC<{ className?: string }> = ({ className }) => (
	<Card flush className={cn(panelClass, className)}>
		<SkeletonGroup label="Loading saved spec" className="flex flex-col gap-3 p-4">
			<Skeleton className="h-3 w-12" />
			<Skeleton className="h-8 w-56 max-w-full rounded-lg" />
			<Skeleton className="h-40 w-full rounded-lg" />
			<Skeleton className="h-4 w-40" />
			<div className="mt-3 space-y-2 border-t border-line pt-4">
				<Skeleton className="h-9 w-full rounded-lg" />
				{Array.from({ length: 6 }, (_, index) => (
					<Skeleton key={index} className="h-10 w-full rounded-lg" />
				))}
			</div>
		</SkeletonGroup>
	</Card>
);

export const SwaggerInputPanel: FC<SwaggerInputPanelProps> = ({
	m,
	className,
	onSnapshotSaved,
	onNavigateToCompareLatest,
}) => !m.isHydrated ? (
	<InputPanelSkeleton className={className} />
) : (
	<Card flush className={cn(panelClass, className)}>
		<div className="border-b border-line p-4">
			<p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
				// input
			</p>
			<SwaggerInputModeToggle inputMode={m.inputMode} onModeChange={m.setInputMode} />

			{m.inputMode === "manual" ? (
				<SwaggerManualJsonInput
					rawJson={m.rawJson}
					onRawJsonChange={m.setRawJson}
					onFileUpload={m.onFileUpload}
					onFileDrop={m.loadFile}
					onPasteUrl={m.openPastedUrl}
					onSnapshotSaved={onSnapshotSaved}
				/>
			) : (
				<SwaggerUrlFetchForm
					isFetchingUrl={m.isFetchingUrl}
					urlFetchError={m.urlFetchError}
					extensionAvailable={m.extensionAvailable}
					extensionHosts={m.extensionHosts}
					onFetchFromUrl={m.onFetchFromUrl}
					rawJson={m.rawJson}
					onSnapshotSaved={onSnapshotSaved}
					profiles={m.profiles}
					selectedProfile={m.selectedProfile}
					onSelectProfile={m.selectProfile}
					onCreateProfile={m.createProfile}
					onEditProfile={m.editProfile}
					onDeleteProfile={m.deleteProfile}
					pendingProfileUrl={m.pendingProfileUrl}
					onClearPendingProfileUrl={m.clearPendingProfileUrl}
					onSetSessionPassword={m.setProfileSessionPassword}
				/>
			)}

			<SwaggerParseStatus
				error={m.parsed.error}
				endpointCount={m.allEndpoints.length}
				indexing={m.isIndexing}
				hasDoc={Boolean(m.parsed.doc)}
				diagnostics={m.diagnostics}
				fullSpecSize={m.fullSpecSize}
			/>

			<SwaggerDiagnosticsPanel report={m.diagnostics} className="mt-3" />

			{onNavigateToCompareLatest ? (
				<div className="mt-3">
					<Button
						size="sm"
						onClick={onNavigateToCompareLatest}
						leftIcon={<GitCompare className="h-4 w-4" />}
					>
						Compare to latest version
					</Button>
				</div>
			) : null}
		</div>

		<SwaggerEndpointSearch
			searchQuery={m.searchQuery}
			onSearchQueryChange={m.setSearchQuery}
			selectedMethods={m.selectedMethods}
			onToggleMethod={m.toggleMethod}
			selectedCount={m.selectedCount}
			totalEndpoints={m.allEndpoints.length}
			visibleAllSelected={m.visibleAllSelected}
			onToggleSelectAllVisible={m.toggleSelectAllVisible}
			canToggleVisible={m.filteredEndpoints.length > 0}
			endpoints={m.allEndpoints}
			groupMode={m.groupMode}
			onGroupModeChange={m.setGroupMode}
			sharedSelectionPending={m.sharedSelectionPending}
			onDismissSharedSelection={m.dismissSharedSelection}
			selectionActions={
				<SwaggerPresetMenu
					presets={m.presets}
					presetMatches={m.presetMatches}
					specKey={m.specKey}
					selectedCount={m.selectedCount}
					hasSpec={m.allEndpoints.length > 0}
					onSavePreset={m.savePreset}
					onApplyPreset={m.applyPreset}
					onDeletePreset={m.deletePreset}
				/>
			}
		/>

		<SwaggerEndpointList
			groups={m.endpointGroups}
			groupMode={m.groupMode}
			collapsedGroups={m.collapsedGroups}
			onToggleGroupCollapsed={m.toggleGroupCollapsed}
			onSetGroupCollapsed={m.setGroupCollapsed}
			selectedIds={m.selectedIds}
			onToggleSelection={m.toggleSelection}
			onSetSelected={m.setEndpointsSelected}
			onClearSearch={() => m.setSearchQuery("")}
			diagnosticsByEndpoint={m.diagnostics.byEndpoint}
		/>
	</Card>
);
