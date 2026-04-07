import { format } from "date-fns";
import type { FC } from "react";
import { useState } from "react";
import type { SavedSnapshot } from "../../utils/swaggerSavedSnapshotsStorage";
import {
	getSnapshot,
	removeSnapshot,
} from "../../utils/swaggerSavedSnapshotsStorage";
import { compareOpenApiRawJson, type OpenApiCompareResult } from "../../utils/openApiCompare";
import { SwaggerCompareResults } from "./SwaggerCompareResults";
import { SwaggerSnapshotList } from "./SwaggerSnapshotList";

type SwaggerComparePanelProps = {
	snapshots: SavedSnapshot[];
	onSnapshotsChange: () => void;
	onLoadSnapshot: (rawJson: string) => void;
	onSwitchToMinifier: () => void;
};

export const SwaggerComparePanel: FC<SwaggerComparePanelProps> = ({
	snapshots,
	onSnapshotsChange,
	onLoadSnapshot,
	onSwitchToMinifier,
}) => {
	const [idA, setIdA] = useState("");
	const [idB, setIdB] = useState("");
	const [compareResult, setCompareResult] = useState<OpenApiCompareResult | null>(null);

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
	};

	const selectAsA = (id: string) => {
		setIdA(id);
		setCompareResult(null);
		if (idB === id) setIdB("");
	};

	const selectAsB = (id: string) => {
		setIdB(id);
		setCompareResult(null);
		if (idA === id) setIdA("");
	};

	const handleCompare = () => {
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
			setCompareResult({ ok: false, error: "Snapshot not found. Refresh the list." });
			return;
		}

		const result = compareOpenApiRawJson(snapA.rawJson, snapB.rawJson, {
			labelA: snapA.name,
			labelB: snapB.name,
		});
		setCompareResult(result);
	};

	return (
		<div className="flex flex-col gap-6 lg:flex-row">
			<div className="lg:w-1/3">
				<h2 className="mb-2 text-sm font-semibold text-slate-200">Saved snapshots</h2>
				<p className="mb-2 text-xs text-slate-500">
					Click <span className="font-mono text-rose-300/90">A</span> or{" "}
					<span className="font-mono text-emerald-300/90">B</span> on a row to pick versions for
					compare (or use the dropdowns on the right).
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
					<h2 className="mb-2 text-sm font-semibold text-slate-200">Compare two versions</h2>
					<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
						<label className="flex min-w-[160px] flex-1 flex-col gap-1">
							<span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
								Version A (baseline)
							</span>
							<select
								value={idA}
								onChange={(e) => {
									setIdA(e.target.value);
									setCompareResult(null);
								}}
								className="rounded-md border border-slate-700 bg-slate-950/90 px-2 py-2 text-xs text-slate-200 outline-none focus:border-accent"
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
								}}
								className="rounded-md border border-slate-700 bg-slate-950/90 px-2 py-2 text-xs text-slate-200 outline-none focus:border-accent"
							>
								<option value="">Select snapshot…</option>
								{options}
							</select>
						</label>
						<button
							type="button"
							onClick={handleCompare}
							disabled={snapshots.length < 2}
							className="rounded-md border border-accent bg-accent/20 px-4 py-2 text-xs font-medium text-slate-100 transition hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Compare
						</button>
					</div>
				</div>

				<div>
					<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
						Results
					</h3>
					<SwaggerCompareResults result={compareResult} />
				</div>
			</div>
		</div>
	);
};
