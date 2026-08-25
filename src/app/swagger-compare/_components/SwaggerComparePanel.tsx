"use client";

import { format } from "date-fns";
import { Copy, GitCompare } from "lucide-react";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import type { SavedSnapshot } from "@/lib/swaggerSavedSnapshotsStorage";
import { removeSnapshot } from "@/lib/swaggerSavedSnapshotsStorage";
import {
  buildEndpointsClipboardText,
  compareOpenApiRawJson,
  type OpenApiCompareResult,
} from "@/lib/openApiCompare";
import { SwaggerCompareResults } from "./SwaggerCompareResults";
import { SwaggerCompareTree } from "./SwaggerCompareTree";
import { endpointDomId } from "../_lib/compareTree";
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
  const [focusedEndpointId, setFocusedEndpointId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const resetResult = () => {
    setCompareResult(null);
    setFocusedEndpointId(null);
    setSelectedIds(new Set());
  };

  /** Jump to the result row for a path picked in the tree. */
  const handleSelectEndpoint = (endpointId: string) => {
    setFocusedEndpointId(endpointId);
    document
      .getElementById(endpointDomId(endpointId))
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

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
    setFocusedEndpointId(null);
    const result = compareOpenApiRawJson(snapA.rawJson, snapB.rawJson, {
      labelA: snapA.name,
      labelB: snapB.name,
    });
    setCompareResult(result);
    setSelectedIds(
      result.ok
        ? new Set([
            ...result.added.map((i) => i.id),
            ...result.changed.map((i) => i.id),
          ])
        : new Set(),
    );
  };

  const snapBForCopy = idB ? snapshots.find((s) => s.id === idB) : undefined;

  /** Endpoints that exist in B — the only ones that can be copied. */
  const selectableIds = useMemo(
    () =>
      compareResult?.ok
        ? [
            ...compareResult.added.map((i) => i.id),
            ...compareResult.changed.map((i) => i.id),
          ]
        : [],
    [compareResult],
  );

  const setEndpointsSelected = (ids: string[], selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const toggleEndpoint = (id: string) =>
    setEndpointsSelected([id], !selectedIds.has(id));

  const selectedCount = selectedIds.size;
  const canCopySelected = selectedCount > 0 && Boolean(snapBForCopy?.rawJson);

  const handleCopySelected = async (fmt: "full" | "short") => {
    if (!snapBForCopy?.rawJson) return;
    // Keep the diff order (added, then changed) rather than click order.
    const ids = selectableIds.filter((id) => selectedIds.has(id));
    const text = buildEndpointsClipboardText(snapBForCopy.rawJson, ids, fmt);
    if (text === null) {
      toast("Nothing to copy", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast(
        `${ids.length} endpoint${ids.length === 1 ? "" : "s"} copied (${fmt})`,
        "success",
      );
    } catch {
      toast("Couldn't access the clipboard", "error");
    }
  };

  const notEnough = snapshots.length < 2;

  const hasDiff =
    compareResult?.ok === true &&
    compareResult.added.length +
      compareResult.removed.length +
      compareResult.changed.length >
      0;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,5fr)] lg:grid-rows-1",
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
      <div className="flex min-h-0 min-w-0 flex-col gap-3 sm:gap-5">
        <Card className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="hidden shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted xl:block">
              // compare
            </p>
            <div className="grid min-w-[15rem] flex-1 grid-cols-2 gap-2">
              <Select
                aria-label="Baseline snapshot (A)"
                title="Baseline (A)"
                className="py-1.5 text-xs"
                adornment={
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-rose-500/15 font-mono text-[10px] font-semibold text-rose-500">
                    A
                  </span>
                }
                value={idA}
                onChange={(e) => selectAsA(e.target.value)}
                disabled={notEnough}
              >
                <option value="">Baseline…</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === idB}>
                    {snapshotLabel(s)}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Snapshot to compare against (B)"
                title="Compare against (B)"
                className="py-1.5 text-xs"
                adornment={
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-emerald-500/15 font-mono text-[10px] font-semibold text-emerald-500">
                    B
                  </span>
                }
                value={idB}
                onChange={(e) => selectAsB(e.target.value)}
                disabled={notEnough}
              >
                <option value="">Compare against…</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === idA}>
                    {snapshotLabel(s)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant="primary"
                onClick={handleCompare}
                disabled={notEnough}
                leftIcon={<GitCompare className="h-3.5 w-3.5" />}
              >
                Compare
              </Button>
              <Button
                size="sm"
                disabled={!canCopySelected}
                onClick={() => void handleCopySelected("full")}
                title="Copy the selected endpoints from B as minified JSON"
                leftIcon={<Copy className="h-3.5 w-3.5" />}
              >
                JSON
              </Button>
              <Button
                size="sm"
                disabled={!canCopySelected}
                onClick={() => void handleCopySelected("short")}
                title="Copy the selected endpoints from B as a short method + path list"
                leftIcon={<Copy className="h-3.5 w-3.5" />}
              >
                Short
              </Button>
              {selectableIds.length > 0 ? (
                <span className="flex items-center gap-2 text-xs text-muted">
                  <span className="whitespace-nowrap">
                    <span className="font-mono text-accent">{selectedCount}</span>/
                    {selectableIds.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEndpointsSelected(selectableIds, true)}
                    className="font-medium text-accent hover:underline"
                  >
                    All
                  </button>
                  <span className="text-line">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="font-medium text-accent hover:underline"
                  >
                    Clear
                  </button>
                </span>
              ) : null}
            </div>
          </div>
          {selectableIds.length > 0 ? (
            <p className="mt-2 hidden text-xs text-muted lg:block">
              Tick endpoints in the path tree or the results below, then copy them.
              Endpoints only in{" "}
              <span className="font-mono text-rose-500">A</span> can&apos;t be copied
              — they no longer exist in B.
            </p>
          ) : null}
          {notEnough ? (
            <p className="mt-2 text-xs text-muted">
              Save at least two snapshots in the Minifier to compare.
            </p>
          ) : null}
        </Card>

        <div className="flex min-h-0 flex-1 flex-col">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            // results
          </p>
          <div
            className={cn(
              "grid min-h-0 flex-1 grid-cols-1 gap-2",
              hasDiff && "lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]",
            )}
          >
            {hasDiff ? (
              <SwaggerCompareTree
                className="max-h-72 lg:max-h-none"
                result={compareResult}
                selectedEndpointId={focusedEndpointId}
                onSelectEndpoint={handleSelectEndpoint}
                checkedEndpointIds={selectedIds}
                onToggleEndpoint={toggleEndpoint}
                onSetEndpointsChecked={setEndpointsSelected}
              />
            ) : null}
            <div className="scroll-ide min-h-0 flex-1 overflow-y-auto pr-1">
              <SwaggerCompareResults
                result={compareResult}
                focusedEndpointId={focusedEndpointId}
                checkedEndpointIds={selectedIds}
                onToggleEndpoint={toggleEndpoint}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
