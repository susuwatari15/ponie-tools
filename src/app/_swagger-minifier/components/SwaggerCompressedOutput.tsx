"use client";

import { Braces, Copy, FileJson, Link2, ListTree, ToyBrick, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { JsonTree } from "@/components/ui/JsonTree";
import { JsonView } from "@/components/ui/JsonView";
import { Kbd } from "@/components/ui/Kbd";
import { useToast } from "@/components/ui/ToastProvider";
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
import { SpecBrickView } from "./spec-bricks/SpecBrickView";
import { SwaggerMinifyOptionsMenu } from "./SwaggerMinifyOptionsMenu";

const SIZE_TONE_CLASS: Record<SizeTone, string> = {
  ok: "text-muted",
  warn: "text-put",
  danger: "text-del",
};

type OutputViewMode = "json" | "tree" | "bricks";

const VIEW_MODE_STORAGE_KEY = "ponie-minifier-output-view";

const VIEW_MODES: { value: OutputViewMode; label: string; icon: LucideIcon }[] = [
  { value: "json", label: "JSON", icon: Braces },
  { value: "tree", label: "Tree", icon: ListTree },
  { value: "bricks", label: "Bricks", icon: ToyBrick },
];

function isOutputViewMode(value: unknown): value is OutputViewMode {
  return VIEW_MODES.some((mode) => mode.value === value);
}

type SwaggerCompressedOutputProps = {
  hasParseError: boolean;
  selectedCount: number;
  minifiedOutput: string;
  /** Single-line JSON, copied by "Copy Minified". */
  minifiedCompact: string;
  outputSize: SizeEstimate | null;
  fullSpecSize: SizeEstimate | null;
  minifyOptions: MinifyOptions;
  onMinifyOptionsChange: (options: MinifyOptions) => void;
  onBuildShareLink: () => Promise<string>;
  onDeselectEndpoint?: (id: string) => void;
};

export const SwaggerCompressedOutput: FC<SwaggerCompressedOutputProps> = ({
  hasParseError,
  selectedCount,
  minifiedOutput,
  minifiedCompact,
  outputSize,
  fullSpecSize,
  minifyOptions,
  onMinifyOptionsChange,
  onBuildShareLink,
  onDeselectEndpoint,
}) => {
  const { toast } = useToast();
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

  const copy = async (label: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copied to clipboard`, "success");
    } catch {
      toast("Couldn't access the clipboard", "error");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(await onBuildShareLink());
      toast("Link to this selection copied", "success");
    } catch {
      toast("Couldn't access the clipboard", "error");
    }
  };

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
    <Card flush className="flex min-h-[560px] flex-col overflow-hidden lg:min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            // output
          </p>
          <h2 className="text-sm font-semibold text-fg">Compressed spec</h2>
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
          <div
            className="inline-flex rounded-lg border border-line bg-raised/60 p-0.5"
            role="tablist"
            aria-label="Output view"
          >
            {VIEW_MODES.map(({ value, label, icon: Icon }) => {
              const active = viewMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setViewMode(value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
                    active ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
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
        {hasParseError ? (
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
