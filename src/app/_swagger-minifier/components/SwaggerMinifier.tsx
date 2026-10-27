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
        m={m}
        onSnapshotSaved={onSnapshotSaved}
        onNavigateToCompareLatest={onNavigateToCompareLatest}
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
        minifiedCompact={m.minifiedCompact}
        outputSize={m.outputSize}
        fullSpecSize={m.fullSpecSize}
        minifyOptions={m.minifyOptions}
        onMinifyOptionsChange={m.setMinifyOptions}
        onBuildShareLink={m.buildShareLink}
        onDeselectEndpoint={m.toggleSelection}
      />
    </div>
  );
};

export default SwaggerMinifier;
