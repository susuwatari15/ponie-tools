"use client";

import { Copy, FileJson } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";

type SwaggerCompressedOutputProps = {
  hasParseError: boolean;
  selectedCount: number;
  minifiedOutput: string;
  minifiedOutputShort: string;
};

export const SwaggerCompressedOutput: FC<SwaggerCompressedOutputProps> = ({
  hasParseError,
  selectedCount,
  minifiedOutput,
  minifiedOutputShort,
}) => {
  const { toast } = useToast();

  const copy = async (label: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copied to clipboard`, "success");
    } catch {
      toast("Couldn't access the clipboard", "error");
    }
  };

  const minifiedString = (() => {
    try {
      return JSON.stringify(JSON.parse(minifiedOutput));
    } catch {
      return minifiedOutput;
    }
  })();

  const hasOutput = Boolean(minifiedOutput);

  return (
    <Card flush className="flex min-h-[560px] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            // output
          </p>
          <h2 className="text-sm font-semibold text-fg">Compressed spec</h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
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
            disabled={!minifiedOutputShort}
            onClick={() => copy("Short list", minifiedOutputShort)}
            title="Module + endpoint list"
            leftIcon={<Copy className="h-3.5 w-3.5" />}
          >
            Short
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!hasOutput}
            onClick={() => copy("Minified JSON", minifiedString)}
            title="Compact single-line JSON"
            leftIcon={<Copy className="h-3.5 w-3.5" />}
          >
            Minified
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
        ) : (
          <pre className="scroll-ide h-full max-h-[62vh] overflow-auto rounded-lg border border-line bg-ink/40 p-3 font-mono text-xs leading-6 text-fg dark:bg-ink/60">
            {minifiedOutput}
          </pre>
        )}
      </div>
    </Card>
  );
};
