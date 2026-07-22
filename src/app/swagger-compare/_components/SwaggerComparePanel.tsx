"use client";

import { format } from "date-fns";
import { Copy, GitCompare } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import type { SavedSnapshot } from "@/lib/swaggerSavedSnapshotsStorage";
import { removeSnapshot } from "@/lib/swaggerSavedSnapshotsStorage";
import {
  buildNewChangedClipboardText,
  compareOpenApiRawJson,
  type OpenApiCompareResult,
} from "@/lib/openApiCompare";
import { SwaggerCompareResults } from "./SwaggerCompareResults";
import { SwaggerSnapshotList } from "./SwaggerSnapshotList";

type SwaggerComparePanelProps = {
  snapshots: SavedSnapshot[];
  onSnapshotsChange: () => void;
  onLoadSnapshot: (rawJson: string) => void | Promise<void>;
  onSwitchToMinifier: () => void;
  initialSnapshotIdA?: string;
  initialSnapshotIdB?: string;
  className?: string;
};

function snapshotLabel(s: SavedSnapshot): string {
  return `${s.name} — ${format(new Date(s.createdAt), "yyyy-MM-dd HH:mm")}`;
}

export const SwaggerComparePanel: FC<SwaggerComparePanelProps> = ({
  snapshots,
  onSnapshotsChange,
  onLoadSnapshot,
  onSwitchToMinifier,
  initialSnapshotIdA = "",
  initialSnapshotIdB = "",
  className,
}) => {
  const { toast } = useToast();
  const [idA, setIdA] = useState(initialSnapshotIdA);
  const [idB, setIdB] = useState(initialSnapshotIdB);
  const [compareResult, setCompareResult] =
    useState<OpenApiCompareResult | null>(null);

  const resetResult = () => setCompareResult(null);

  const handleLoad = async (snap: SavedSnapshot) => {
    await onLoadSnapshot(snap.rawJson);
    onSwitchToMinifier();
  };

  const handleDelete = async (id: string) => {
    await removeSnapshot(id);
    onSnapshotsChange();
    if (idA === id) setIdA("");
    if (idB === id) setIdB("");
    resetResult();
    toast("Snapshot deleted", "success");
  };

  const selectAsA = (id: string) => {
    setIdA(id);
    resetResult();
    if (idB === id) setIdB("");
  };

  const selectAsB = (id: string) => {
    setIdB(id);
    resetResult();
    if (idA === id) setIdA("");
  };

  const handleCompare = () => {
    if (!idA || !idB || idA === idB) {
      setCompareResult({ ok: false, error: "Pick two different snapshots." });
      return;
    }
    const snapA = snapshots.find((s) => s.id === idA);
    const snapB = snapshots.find((s) => s.id === idB);
    if (!snapA || !snapB) {
      setCompareResult({ ok: false, error: "Snapshot not found. Refresh the list." });
      return;
    }
    setCompareResult(
      compareOpenApiRawJson(snapA.rawJson, snapB.rawJson, {
        labelA: snapA.name,
        labelB: snapB.name,
      }),
    );
  };

  const snapBForCopy = idB ? snapshots.find((s) => s.id === idB) : undefined;
  const canCopyNewAndChanged =
    compareResult?.ok === true &&
    compareResult.added.length + compareResult.changed.length > 0 &&
    Boolean(snapBForCopy?.rawJson);

  const handleCopyNewAndChanged = async (fmt: "full" | "short") => {
    if (!compareResult?.ok || !snapBForCopy?.rawJson) return;
    const text = buildNewChangedClipboardText(compareResult, snapBForCopy.rawJson, fmt);
    if (text === null) {
      toast("Nothing to copy", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast(`New & changed (${fmt}) copied`, "success");
    } catch {
      toast("Couldn't access the clipboard", "error");
    }
  };

  const notEnough = snapshots.length < 2;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:grid-rows-1",
        className,
      )}
    >
      {/* Saved snapshots */}
      <div className="flex min-h-0 flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            // saved snapshots
          </p>
        </div>
        <p className="text-xs text-muted">
          Tag any two rows as{" "}
          <span className="font-mono text-rose-500">A</span> and{" "}
          <span className="font-mono text-emerald-500">B</span>, or use the
          selectors on the right.
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

      {/* Compare */}
      <div className="flex min-h-0 min-w-0 flex-col gap-5">
        <Card>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            // compare
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-rose-500/15 font-mono text-[10px] font-semibold text-rose-500">
                  A
                </span>
                Baseline
              </span>
              <Select
                value={idA}
                onChange={(e) => selectAsA(e.target.value)}
                disabled={notEnough}
              >
                <option value="">Select snapshot…</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === idB}>
                    {snapshotLabel(s)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-emerald-500/15 font-mono text-[10px] font-semibold text-emerald-500">
                  B
                </span>
                Compare against
              </span>
              <Select
                value={idB}
                onChange={(e) => selectAsB(e.target.value)}
                disabled={notEnough}
              >
                <option value="">Select snapshot…</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === idA}>
                    {snapshotLabel(s)}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              onClick={handleCompare}
              disabled={notEnough}
              leftIcon={<GitCompare className="h-4 w-4" />}
            >
              Compare
            </Button>
            <Button
              disabled={!canCopyNewAndChanged}
              onClick={() => void handleCopyNewAndChanged("full")}
              title="Copy the new & changed operations from B (full JSON)"
              leftIcon={<Copy className="h-3.5 w-3.5" />}
            >
              New &amp; changed (JSON)
            </Button>
            <Button
              disabled={!canCopyNewAndChanged}
              onClick={() => void handleCopyNewAndChanged("short")}
              title="Copy the new & changed operations from B (short list)"
              leftIcon={<Copy className="h-3.5 w-3.5" />}
            >
              Short
            </Button>
          </div>
          {notEnough ? (
            <p className="mt-3 text-xs text-muted">
              Save at least two snapshots in the Minifier to compare.
            </p>
          ) : null}
        </Card>

        <div className="flex min-h-0 flex-1 flex-col">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            // results
          </p>
          <div className="scroll-ide min-h-0 flex-1 overflow-y-auto pr-1">
            <SwaggerCompareResults
              result={compareResult}
              rawJsonB={snapBForCopy?.rawJson}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
