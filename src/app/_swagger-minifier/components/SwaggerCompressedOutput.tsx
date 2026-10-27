"use client";

import { Braces, Copy, FileJson, Link2, ListTree, ToyBrick } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FC } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { JsonView } from "@/components/ui/JsonView";
import { Kbd } from "@/components/ui/Kbd";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/SegmentedControl";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { useCopy } from "@/components/ui/useCopy";
import type { MinifyOptions } from "@/lib/swaggerMinifier";
import {
  formatBytes,
  formatTokens,
  type SizeEstimate,
  type SizeTone,
  sizeTone,
  TOKEN_DANGER_THRESHOLD,
  TOKEN_WARN_THRESHOLD,
} from "@/lib/tokenEstimate";
import { SwaggerMinifyOptionsMenu } from "./SwaggerMinifyOptionsMenu";

const SIZE_TONE_CLASS: Record<SizeTone, string> = {
  ok: "text-muted",
  warn: "text-put",
  danger: "text-del",
};

type OutputViewMode = "json" | "tree" | "bricks";

const VIEW_MODE_STORAGE_KEY = "ponie-minifier-output-view";

const VIEW_MODES: SegmentedOption<OutputViewMode>[] = [
  { value: "json", label: "JSON", icon: Braces },
  { value: "tree", label: "Tree", icon: ListTree },
  { value: "bricks", label: "Bricks", icon: ToyBrick },
];

function isOutputViewMode(value: unknown): value is OutputViewMode {
  return VIEW_MODES.some((mode) => mode.value === value);
}

const OutputSkeleton: FC<{ label?: string }> = ({ label = "Loading output view" }) => (
  <SkeletonGroup
    label={label}
    className="h-full space-y-2 rounded-lg border border-line bg-ink/40 p-3 dark:bg-ink/60"
  >
    {["w-1/3", "w-2/3", "w-1/2", "w-3/4", "w-2/5", "w-3/5", "w-1/2"].map((width, index) => (
      <Skeleton key={index} className={cn("h-3", width)} />
    ))}
  </SkeletonGroup>
);

// The tree and brick views are opt-in and never part of the prerendered page,
// so they load on demand; the default JSON view stays in the page bundle.
const JsonTree = dynamic(() => import("@/components/ui/JsonTree").then((mod) => mod.JsonTree), {
  loading: () => <OutputSkeleton />,
});
const SpecBrickView = dynamic(
  () => import("./spec-bricks/SpecBrickView").then((mod) => mod.SpecBrickView),
  { loading: () => <OutputSkeleton /> },
);

type SwaggerCompressedOutputProps = {
  className?: string;
  /** Persisted state is still hydrating — show a skeleton, not an empty state. */
  isLoading?: boolean;
  hasParseError: boolean;
  selectedCount: number;
  minifiedOutput: string;
  /** Single-line JSON, copied by "Copy Minified". */
  minifiedCompact: string;
  outputSize: SizeEstimate | null;
  /** A large spec's output is being rebuilt in the worker; the last output is still shown. */
  isUpdating?: boolean;
  fullSpecSize: SizeEstimate | null;
  minifyOptions: MinifyOptions;
  onMinifyOptionsChange: (options: MinifyOptions) => void;
  onBuildShareLink: () => Promise<string>;
  onDeselectEndpoint?: (id: string) => void;
};

export const SwaggerCompressedOutput: FC<SwaggerCompressedOutputProps> = ({
  className,
  isLoading = false,
  hasParseError,
  selectedCount,
  minifiedOutput,
  minifiedCompact,
  outputSize,
  isUpdating = false,
  fullSpecSize,
  minifyOptions,
  onMinifyOptionsChange,
  onBuildShareLink,
  onDeselectEndpoint,
}) => {
  const copyToClipboard = useCopy();
  const [viewMode, setViewModeState] = useState<OutputViewMode>("json");

  // Restore after mount — localStorage isn't available during SSR, and reading
  // it in the initial state would cause a hydration mismatch.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (isOutputViewMode(stored)) setViewModeState(stored);
    } catch {
      // storage unavailable
    }
  }, []);

  const setViewMode = (next: OutputViewMode) => {
    setViewModeState(next);
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, next);
    } catch {
      // storage unavailable
    }
  };

  const copy = (label: string, text: string) =>
    copyToClipboard(text, `${label} copied to clipboard`);

  const copyLink = () => copyToClipboard(onBuildShareLink(), "Link to this selection copied");

  const parsedOutput = useMemo<unknown>(() => {
    try {
      return JSON.parse(minifiedOutput);
    } catch {
      return undefined;
    }
  }, [minifiedOutput]);

  const hasOutput = Boolean(minifiedOutput);

  // Cmd/Ctrl+Enter copies the minified output from anywhere on the page. The
  // ref keeps one listener while the output changes underneath it.
  const copyMinifiedRef = useRef<() => void>(() => {});
  copyMinifiedRef.current = () => void copy("Minified JSON", minifiedCompact);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !event.defaultPrevented) {
        event.preventDefault();
        copyMinifiedRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tone = outputSize ? sizeTone(outputSize.tokens) : "ok";
  const shareOfFull =
    outputSize && fullSpecSize && fullSpecSize.bytes > 0
      ? Math.max(1, Math.round((outputSize.bytes / fullSpecSize.bytes) * 100))
      : null;

  return (
    <Card flush className={cn("flex min-h-[560px] flex-col overflow-hidden lg:min-h-0", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            // output
          </p>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-fg">
            Compressed spec
            {isUpdating ? <Spinner className="h-3.5 w-3.5" label="Updating output" /> : null}
          </h2>
          {outputSize ? (
            <p
              className={cn("mt-0.5 font-mono text-[11px]", SIZE_TONE_CLASS[tone])}
              title={`Approximate (~4 chars per token) for the minified JSON. Amber from ${TOKEN_WARN_THRESHOLD / 1000}k, red from ${TOKEN_DANGER_THRESHOLD / 1000}k tokens.`}
            >
              {formatTokens(outputSize.tokens)} · {formatBytes(outputSize.bytes)}
              {shareOfFull !== null ? ` · ${shareOfFull}% of full spec` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <SegmentedControl
            value={viewMode}
            onChange={setViewMode}
            options={VIEW_MODES}
            label="Output view"
          />
          <span className="mx-0.5 hidden h-5 w-px bg-line sm:block" aria-hidden />
          <SwaggerMinifyOptionsMenu options={minifyOptions} onChange={onMinifyOptionsChange} />
          <IconButton
            label="Copy link to this selection"
            disabled={selectedCount === 0}
            onClick={copyLink}
          >
            <Link2 className="h-3.5 w-3.5" />
          </IconButton>
          <Button
            size="sm"
            disabled={!hasOutput}
            onClick={() => copy("Full JSON", minifiedOutput)}
            leftIcon={<FileJson className="h-3.5 w-3.5" />}
          >
            Full JSON
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!hasOutput}
            onClick={() => copy("Minified JSON", minifiedCompact)}
            title="Compact single-line JSON (⌘/Ctrl+Enter)"
            aria-keyshortcuts="Control+Enter Meta+Enter"
            leftIcon={<Copy className="h-3.5 w-3.5" />}
            rightIcon={
              <Kbd className="border-white/30 bg-white/15 text-white/90">⌘↵</Kbd>
            }
          >
            Copy Minified
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-3">
        {isLoading ? (
          <OutputSkeleton label="Loading saved selection" />
        ) : hasParseError ? (
          <EmptyState
            tone="error"
            title="Invalid JSON"
            description="Fix the input on the left to generate a compressed spec."
            className="h-full"
          />
        ) : selectedCount === 0 ? (
          <EmptyState
            title="Nothing selected yet"
            description="Pick one or more endpoints from the left pane to build a prompt-ready spec."
            className="h-full"
          />
        ) : viewMode === "tree" && parsedOutput !== undefined ? (
          <JsonTree value={parsedOutput} className="h-full" />
        ) : viewMode === "bricks" ? (
          <SpecBrickView
            minifiedOutput={minifiedOutput}
            onDeselectEndpoint={onDeselectEndpoint}
            className="h-full"
          />
        ) : (
          <JsonView
            value={minifiedOutput}
            className="h-full rounded-lg border border-line bg-ink/40 p-3 dark:bg-ink/60"
          />
        )}
      </div>
    </Card>
  );
};
