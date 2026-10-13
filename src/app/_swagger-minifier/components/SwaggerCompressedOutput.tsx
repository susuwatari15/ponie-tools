"use client";

import { Braces, Copy, FileJson, ListTree, ToyBrick, type LucideIcon } from "lucide-react";
import { useMemo, useState, type FC } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { JsonTree } from "@/components/ui/JsonTree";
import { JsonView } from "@/components/ui/JsonView";
import { useToast } from "@/components/ui/ToastProvider";
import { SpecBrickView } from "./spec-bricks/SpecBrickView";

type OutputViewMode = "json" | "tree" | "bricks";

const VIEW_MODES: { value: OutputViewMode; label: string; icon: LucideIcon }[] = [
  { value: "json", label: "JSON", icon: Braces },
  { value: "tree", label: "Tree", icon: ListTree },
  { value: "bricks", label: "Bricks", icon: ToyBrick },
];

type SwaggerCompressedOutputProps = {
  hasParseError: boolean;
  selectedCount: number;
  minifiedOutput: string;
  onDeselectEndpoint?: (id: string) => void;
};

export const SwaggerCompressedOutput: FC<SwaggerCompressedOutputProps> = ({
  hasParseError,
  selectedCount,
  minifiedOutput,
  onDeselectEndpoint,
}) => {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<OutputViewMode>("json");

  const copy = async (label: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copied to clipboard`, "success");
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

  const minifiedString =
    parsedOutput === undefined ? minifiedOutput : JSON.stringify(parsedOutput);

  const hasOutput = Boolean(minifiedOutput);

  return (
    <Card flush className="flex min-h-[560px] flex-col overflow-hidden lg:min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            // output
          </p>
          <h2 className="text-sm font-semibold text-fg">Compressed spec</h2>
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
            onClick={() => copy("Minified JSON", minifiedString)}
            title="Compact single-line JSON"
            leftIcon={<Copy className="h-3.5 w-3.5" />}
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
