import type { FC } from "react";
import { GitCompare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
	onSnapshotSaved?: () => void;
	onNavigateToCompareLatest?: () => void;
};

export const SwaggerInputPanel: FC<SwaggerInputPanelProps> = ({
	m,
	onSnapshotSaved,
	onNavigateToCompareLatest,
}) => (
	<Card flush className="flex min-h-[560px] flex-col overflow-auto max-h-full lg:min-h-0">
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
				/>
			)}

			<SwaggerParseStatus
				error={m.parsed.error}
				endpointCount={m.allEndpoints.length}
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
