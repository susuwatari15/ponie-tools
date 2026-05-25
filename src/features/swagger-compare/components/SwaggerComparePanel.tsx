import { format } from "date-fns";
import { Check, Copy } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";
import type { SavedSnapshot } from "../../../utils/swaggerSavedSnapshotsStorage";
import {
  getSnapshot,
  removeSnapshot,
} from "../../../utils/swaggerSavedSnapshotsStorage";
import {
  buildNewChangedClipboardText,
  compareOpenApiRawJson,
  type OpenApiCompareResult,
} from "../../../utils/openApiCompare";
import { SwaggerCompareResults } from "./SwaggerCompareResults";
import { SwaggerSnapshotList } from "./SwaggerSnapshotList";

type SwaggerComparePanelProps = {
  snapshots: SavedSnapshot[];
  onSnapshotsChange: () => void;
  onLoadSnapshot: (rawJson: string) => void;
  onSwitchToMinifier: () => void;
  initialSnapshotIdA?: string;
  initialSnapshotIdB?: string;
};

export const SwaggerComparePanel: FC<SwaggerComparePanelProps> = ({
  snapshots,
  onSnapshotsChange,
  onLoadSnapshot,
  onSwitchToMinifier,
  initialSnapshotIdA = "",
  initialSnapshotIdB = "",
}) => {
  const [idA, setIdA] = useState(initialSnapshotIdA);
  const [idB, setIdB] = useState(initialSnapshotIdB);
  const [compareResult, setCompareResult] =
    useState<OpenApiCompareResult | null>(null);
  const [copyNewChangedStatus, setCopyNewChangedStatus] = useState<
    "idle" | "copied" | "failed"
  >("idle");

  const options = snapshots.map((s) => (
    <option key={s.id} value={s.id}>
      {s.name} — {format(new Date(s.createdAt), "yyyy-MM-dd HH:mm")}
    </option>
  ));

  const handleLoad = (snap: SavedSnapshot) => {
    onLoadSnapshot(snap.rawJson);
    onSwitchToMinifier();
  };

  const handleDelete = (id: string) => {
    removeSnapshot(id);
    onSnapshotsChange();
    if (idA === id) setIdA("");
    if (idB === id) setIdB("");
    setCompareResult(null);
    setCopyNewChangedStatus("idle");
  };

  const selectAsA = (id: string) => {
    setIdA(id);
    setCompareResult(null);
    setCopyNewChangedStatus("idle");
    if (idB === id) setIdB("");
  };

  const selectAsB = (id: string) => {
    setIdB(id);
    setCompareResult(null);
    setCopyNewChangedStatus("idle");
    if (idA === id) setIdA("");
  };

  const handleCompare = () => {
    setCopyNewChangedStatus("idle");
    if (!idA || !idB || idA === idB) {
      setCompareResult({
        ok: false,
        error: "Pick two different snapshots.",
      });
      return;
    }

    const snapA = getSnapshot(idA);
    const snapB = getSnapshot(idB);
    if (!snapA || !snapB) {
      setCompareResult({
        ok: false,
        error: "Snapshot not found. Refresh the list.",
      });
      return;
    }

    const result = compareOpenApiRawJson(snapA.rawJson, snapB.rawJson, {
      labelA: snapA.name,
      labelB: snapB.name,
    });
    setCompareResult(result);
  };

  const snapBForCopy = idB ? getSnapshot(idB) : undefined;
  const canCopyNewAndChanged =
    compareResult?.ok === true &&
    compareResult.added.length + compareResult.changed.length > 0 &&
    Boolean(snapBForCopy?.rawJson);

  const handleCopyNewAndChanged = async (format: "full" | "short") => {
    if (!compareResult?.ok || !snapBForCopy?.rawJson) return;
    const text = buildNewChangedClipboardText(
      compareResult,
      snapBForCopy.rawJson,
      format,
    );
    if (text === null) {
      setCopyNewChangedStatus("failed");
      window.setTimeout(() => setCopyNewChangedStatus("idle"), 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyNewChangedStatus("copied");
      window.setTimeout(() => setCopyNewChangedStatus("idle"), 2000);
    } catch {
      setCopyNewChangedStatus("failed");
      window.setTimeout(() => setCopyNewChangedStatus("idle"), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="lg:w-1/3">
        <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          Saved snapshots
        </h2>
        <p className="mb-2 text-xs text-slate-500">
          Click <span className="font-mono text-rose-300/90">A</span> or{" "}
          <span className="font-mono text-emerald-300/90">B</span> on a row to
          pick versions for compare (or use the dropdowns on the right).
        </p>
        <SwaggerSnapshotList
          snapshots={snapshots}
          selectedIdA={idA}
          selectedIdB={idB}
          onSelectAsA={selectAsA}
          onSelectAsB={selectAsB}
          onLoad={handleLoad}
          onDelete={handleDelete}
        />
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            Compare two versions
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            {/* <label className="flex min-w-[160px] flex-1 flex-col gap-1">
							<span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
								Version A (baseline)
							</span>
							<select
								value={idA}
								onChange={(e) => {
									setIdA(e.target.value);
									setCompareResult(null);
									setCopyNewChangedStatus("idle");
								}}
								className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-200"
							>
								<option value="">Select snapshot…</option>
								{options}
							</select>
						</label>
						<label className="flex min-w-[160px] flex-1 flex-col gap-1">
							<span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
								Version B
							</span>
							<select
								value={idB}
								onChange={(e) => {
									setIdB(e.target.value);
									setCompareResult(null);
									setCopyNewChangedStatus("idle");
								}}
								className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-200"
							>
								<option value="">Select snapshot…</option>
								{options}
							</select>
						</label> */}
            <button
              type="button"
              onClick={handleCompare}
              disabled={snapshots.length < 2}
              className="rounded-md border border-accent bg-accent/20 px-4 py-2 text-xs font-medium text-slate-900 transition hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-100"
            >
              Compare
            </button>
            {/* <div className="flex items-center gap-2">
              {copyNewChangedStatus === "copied" ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-400 bg-slate-100 px-3 py-2 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                  <Check className="h-4 w-4 text-emerald-300" aria-hidden />
                  Copied!
                </span>
              ) : copyNewChangedStatus === "failed" ? (
                <span className="rounded-md border border-rose-400 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-200">
                  Copy failed
                </span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={!canCopyNewAndChanged}
                    title="Uses last compare results and current Version B snapshot. Re-run Compare after changing versions."
                    onClick={() => void handleCopyNewAndChanged("full")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-400 bg-slate-100 px-2.5 py-2 text-xs text-slate-800 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-400"
                  >
                    <Copy
                      className="size-3.5 shrink-0 opacity-80"
                      aria-hidden
                    />
                    Full (JSON)
                  </button>
                  <button
                    type="button"
                    disabled={!canCopyNewAndChanged}
                    title="Uses last compare results and current Version B snapshot. Re-run Compare after changing versions."
                    onClick={() => void handleCopyNewAndChanged("short")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-400 bg-slate-100 px-2.5 py-2 text-xs text-slate-800 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-400"
                  >
                    <Copy
                      className="size-3.5 shrink-0 opacity-80"
                      aria-hidden
                    />
                    Short
                  </button>
                </div>
              )}
            </div> */}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Results
          </h3>
          <SwaggerCompareResults result={compareResult} rawJsonB={snapBForCopy?.rawJson} />
        </div>
      </div>
    </div>
  );
};
