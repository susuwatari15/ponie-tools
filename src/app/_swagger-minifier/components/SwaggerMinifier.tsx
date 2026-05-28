import type { FC } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import type { SwaggerMinifierController } from "../hooks/useSwaggerMinifier";
import { mutedText, panelClasses, themeClasses } from "../styles";
import { SwaggerCompressedOutput } from "./SwaggerCompressedOutput";
import { SwaggerInputPanel } from "./SwaggerInputPanel";

export type SwaggerMinifierProps = {
  m: SwaggerMinifierController;
  className?: string;
  onSnapshotSaved?: () => void;
  embedded?: boolean;
  onNavigateToCompareLatest?: () => void;
};

const SwaggerMinifier: FC<SwaggerMinifierProps> = ({
  m,
  className = "",
  onSnapshotSaved,
  embedded = false,
  onNavigateToCompareLatest,
}) => {
  const inner = (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SwaggerInputPanel
        inputMode={m.inputMode}
        onInputModeChange={m.setInputMode}
        rawJson={m.rawJson}
        onRawJsonChange={m.setRawJson}
        onFileUpload={m.onFileUpload}
        onSnapshotSaved={onSnapshotSaved}
        onNavigateToCompareLatest={onNavigateToCompareLatest}
        swaggerUrl={m.swaggerUrl}
        onSwaggerUrlChange={m.setSwaggerUrl}
        username={m.username}
        onUsernameChange={m.setUsername}
        password={m.password}
        onPasswordChange={m.setPassword}
        isFetchingUrl={m.isFetchingUrl}
        urlFetchError={m.urlFetchError}
        onFetchFromUrl={m.onFetchFromUrl}
        parsed={m.parsed}
        allEndpoints={m.allEndpoints}
        searchQuery={m.searchQuery}
        onSearchQueryChange={m.setSearchQuery}
        selectedCount={m.selectedCount}
        visibleAllSelected={m.visibleAllSelected}
        onToggleSelectAllVisible={m.toggleSelectAllVisible}
        filteredEndpoints={m.filteredEndpoints}
        selectedIds={m.selectedIds}
        onToggleSelection={m.toggleSelection}
      />

      <SwaggerCompressedOutput
        hasParseError={Boolean(m.parsed.error)}
        selectedCount={m.selectedCount}
        minifiedOutput={m.minifiedOutput}
        minifiedOutputShort={m.minifiedOutputShort}
        copied={m.copied}
        onCopyFormat={m.onCopyFormat}
      />
    </div>
  );

  if (embedded) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <div className={`w-full space-y-4 p-4 lg:p-4 ${themeClasses} ${className}`}>
      <PageHeader
        title="Swagger Minifier"
        titleAs="h1"
        titleClassName="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
        description="Select only the endpoints you need and generate a compact, prompt-ready swagger view."
        descriptionClassName={`text-sm ${mutedText}`}
        wrapperClassName={`rounded-xl border px-4 py-3 ${panelClasses}`}
      />
      {inner}
    </div>
  );
};

export default SwaggerMinifier;
