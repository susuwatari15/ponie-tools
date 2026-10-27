import { useState, type FC } from "react";
import { cn } from "@/components/ui/cn";
import { ResizeHandle } from "@/components/ui/ResizeHandle";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useResizableSplit } from "@/components/ui/useResizableSplit";
import type { SwaggerMinifierController } from "../hooks/useSwaggerMinifier";
import { SwaggerCompressedOutput } from "./SwaggerCompressedOutput";
import { SwaggerInputPanel } from "./SwaggerInputPanel";

type MinifierPane = "input" | "output";

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

  // Below `lg` the panes are tabs instead of a very tall stack; both stay
  // mounted so switching keeps scroll position and the ⌘↵ shortcut.
  const [pane, setPane] = useState<MinifierPane>("input");

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <SegmentedControl
        value={pane}
        onChange={setPane}
        label="Minifier panes"
        size="md"
        className="lg:hidden"
        options={[
          { value: "input", label: "Input", badge: m.allEndpoints.length || undefined },
          { value: "output", label: "Output", badge: m.selectedCount || undefined },
        ]}
      />
      <div
        ref={inputSplit.containerRef}
        style={inputSplit.containerStyle}
        className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(300px,var(--minifier-input-width))_auto_minmax(0,1fr)] lg:grid-rows-1"
      >
        <SwaggerInputPanel
          m={m}
          className={pane === "input" ? undefined : "hidden lg:flex"}
          onSnapshotSaved={onSnapshotSaved}
          onNavigateToCompareLatest={onNavigateToCompareLatest}
        />

        <ResizeHandle
          {...inputSplit.handleProps}
          label="Resize input panel"
          className="hidden w-5 lg:flex"
        />

        <SwaggerCompressedOutput
          className={pane === "output" ? undefined : "hidden lg:flex"}
          isLoading={!m.isHydrated}
          hasParseError={Boolean(m.parsed.error)}
          selectedCount={m.selectedCount}
          minifiedOutput={m.minifiedOutput}
          minifiedCompact={m.minifiedCompact}
          outputSize={m.outputSize}
          isUpdating={m.isMinifying}
          fullSpecSize={m.fullSpecSize}
          minifyOptions={m.minifyOptions}
          onMinifyOptionsChange={m.setMinifyOptions}
          onBuildShareLink={m.buildShareLink}
          onDeselectEndpoint={m.toggleSelection}
        />
      </div>
    </div>
  );
};

export default SwaggerMinifier;
