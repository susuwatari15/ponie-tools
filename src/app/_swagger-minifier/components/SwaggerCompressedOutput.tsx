import { Check, Copy } from "lucide-react";
import type { FC } from "react";
import { panelClasses } from "../styles";
import type { SwaggerCopyFormat } from "@/lib/swaggerShortFormat";

type SwaggerCompressedOutputProps = {
  hasParseError: boolean;
  selectedCount: number;
  minifiedOutput: string;
  minifiedOutputShort: string;
  copied: boolean;
  onCopyFormat: (format: SwaggerCopyFormat) => void;
};

const copyBtnClass =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-400 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-800 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-400";

export const SwaggerCompressedOutput: FC<SwaggerCompressedOutputProps> = ({
  hasParseError,
  selectedCount,
  minifiedOutput,
  minifiedOutputShort,
  copied,
  onCopyFormat,
}) => {
  const canCopyFull = Boolean(minifiedOutput);
  const canCopyShort = Boolean(minifiedOutputShort);

  return (
    <section
      className={`flex min-h-[640px] flex-col overflow-hidden rounded-xl border ${panelClasses}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-3 dark:border-slate-700/70">
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Compressed Output
          </h2>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {copied ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-400 bg-slate-100 px-3 py-1.5 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
              <Check className="h-4 w-4 text-emerald-300" aria-hidden />
              Copied!
            </span>
          ) : (
            <>
              <button
                type="button"
                disabled={!canCopyFull}
                onClick={() => onCopyFormat("full")}
                className={copyBtnClass}
              >
                <Copy className="size-3.5 shrink-0 opacity-80" aria-hidden />
                Full (JSON)
              </button>
              <button
                type="button"
                disabled={!canCopyShort}
                onClick={() => onCopyFormat("short")}
                title="Module + endpoint list"
                className={copyBtnClass}
              >
                <Copy className="size-3.5 shrink-0 opacity-80" aria-hidden />
                Short
              </button>
            </>
          )}
        </div>
      </div>

      <div className="h-[40vh] min-h-[300px] p-3 lg:h-[70vh]">
        <pre className="h-full overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-6 text-slate-800 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-200">
          {hasParseError
            ? "// Fix invalid JSON to generate output."
            : selectedCount === 0
              ? "// Select one or more endpoints from the left pane."
              : minifiedOutput}
        </pre>
      </div>
    </section>
  );
};
