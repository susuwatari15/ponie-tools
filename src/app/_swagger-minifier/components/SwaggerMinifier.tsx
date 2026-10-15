import type { FC } from "react";
import { ResizeHandle } from "@/components/ui/ResizeHandle";
import { useResizableSplit } from "@/components/ui/useResizableSplit";
import type { SwaggerMinifierController } from "../hooks/useSwaggerMinifier";
import { SwaggerCompressedOutput } from "./SwaggerCompressedOutput";
import { SwaggerInputPanel } from "./SwaggerInputPanel";

export type SwaggerMinifierProps = {
  m: SwaggerMinifierController;
  className?: string;
  onSnapshotSaved?: () => void;
  /** Kept for API compatibility; the page provides the wrapper/header. */
  embedded?: boolean;
  onNavigateToCompareLatest?: () => void;
};

const SwaggerMinifier: FC<SwaggerMinifierProps> = ({
  m,
  className = "",
  onSnapshotSaved,
  onNavigateToCompareLatest,
}) => {
  const inputSplit = useResizableSplit({
    storageKey: "ponie-minifier-input-width",
    cssVar: "--minifier-input-width",
    defaultPercent: 33,
    minPercent: 20,
    maxPercent: 65,
  });

  return (
    <div
      ref={inputSplit.containerRef}
      style={inputSplit.containerStyle}
      className={`grid grid-cols-1 gap-5 lg:grid-cols-[minmax(300px,var(--minifier-input-width))_auto_minmax(0,1fr)] lg:grid-rows-1 lg:gap-0 ${className}`.trim()}
    >
      <SwaggerInputPanel
        inputMode={m.inputMode}
        onInputModeChange={m.setInputMode}
        rawJson={m.rawJson}
        onRawJsonChange={m.setRawJson}
        onFileUpload={m.onFileUpload}
        onSnapshotSaved={onSnapshotSaved}
        onNavigateToCompareLatest={onNavigateToCompareLatest}
        isFetchingUrl={m.isFetchingUrl}
        urlFetchError={m.urlFetchError}
        extensionAvailable={m.extensionAvailable}
        onFetchFromUrl={m.onFetchFromUrl}
        profiles={m.profiles}
        selectedProfile={m.selectedProfile}
        onSelectProfile={m.selectProfile}
        onCreateProfile={m.createProfile}
        onEditProfile={m.editProfile}
        onDeleteProfile={m.deleteProfile}
        parsed={m.parsed}
        diagnostics={m.diagnostics}
        allEndpoints={m.allEndpoints}
        searchQuery={m.searchQuery}
        onSearchQueryChange={m.setSearchQuery}
        selectedMethods={m.selectedMethods}
        onToggleMethod={m.toggleMethod}
        selectedCount={m.selectedCount}
        visibleAllSelected={m.visibleAllSelected}
        onToggleSelectAllVisible={m.toggleSelectAllVisible}
        filteredEndpoints={m.filteredEndpoints}
        selectedIds={m.selectedIds}
        onToggleSelection={m.toggleSelection}
      />

      <ResizeHandle
        {...inputSplit.handleProps}
        label="Resize input panel"
        className="hidden w-5 lg:flex"
      />

      <SwaggerCompressedOutput
        hasParseError={Boolean(m.parsed.error)}
        selectedCount={m.selectedCount}
        minifiedOutput={m.minifiedOutput}
        onDeselectEndpoint={m.toggleSelection}
      />
    </div>
  );
};

export default SwaggerMinifier;
