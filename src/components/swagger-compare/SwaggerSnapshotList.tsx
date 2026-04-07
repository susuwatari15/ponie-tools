import { format } from "date-fns";
import { Trash2, Upload } from "lucide-react";
import type { FC } from "react";
import type { SavedSnapshot } from "../../utils/swaggerSavedSnapshotsStorage";

type SwaggerSnapshotListProps = {
	snapshots: SavedSnapshot[];
	/** Selected as Version A (baseline) for compare */
	selectedIdA: string;
	/** Selected as Version B for compare */
	selectedIdB: string;
	onSelectAsA: (id: string) => void;
	onSelectAsB: (id: string) => void;
	onLoad: (snapshot: SavedSnapshot) => void;
	onDelete: (id: string) => void;
};

export const SwaggerSnapshotList: FC<SwaggerSnapshotListProps> = ({
	snapshots,
	selectedIdA,
	selectedIdB,
	onSelectAsA,
	onSelectAsB,
	onLoad,
	onDelete,
}) => {
	if (snapshots.length === 0) {
		return (
			<p className="text-sm text-slate-500">
				No snapshots yet. Use the Minifier tab and &quot;Save snapshot&quot; to store a version
				here.
			</p>
		);
	}

	return (
		<ul className="divide-y divide-slate-700/80 rounded-lg border border-slate-700/80 bg-slate-950/40">
			{snapshots.map((snap) => {
				const isA = selectedIdA === snap.id;
				const isB = selectedIdB === snap.id;

				return (
					<li
						key={snap.id}
						className={`flex flex-col gap-2 px-3 py-2.5 text-sm transition ${
							isA || isB ? "bg-slate-800/40" : ""
						}`}
					>
						<div className="flex flex-wrap items-start justify-between gap-2">
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<span className="truncate font-medium text-slate-100">{snap.name}</span>
									{isA ? (
										<span className="shrink-0 rounded border border-rose-500/50 bg-rose-950/50 px-1.5 py-px font-mono text-[10px] font-semibold uppercase text-rose-200">
											A
										</span>
									) : null}
									{isB ? (
										<span className="shrink-0 rounded border border-emerald-500/50 bg-emerald-950/50 px-1.5 py-px font-mono text-[10px] font-semibold uppercase text-emerald-200">
											B
										</span>
									) : null}
								</div>
								<div className="text-xs text-slate-500">
									{format(new Date(snap.createdAt), "yyyy-MM-dd HH:mm:ss")}
								</div>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-1">
							<span className="mr-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
								Compare
							</span>
							<button
								type="button"
								onClick={() => onSelectAsA(snap.id)}
								title="Set as Version A (baseline)"
								className={`inline-flex min-w-[2rem] items-center justify-center rounded-md border px-2 py-1 font-mono text-xs font-semibold transition ${
									isA
										? "border-rose-400 bg-rose-950/60 text-rose-100"
										: "border-slate-600 bg-slate-800/80 text-slate-300 hover:border-rose-500/60 hover:text-rose-100"
								}`}
							>
								A
							</button>
							<button
								type="button"
								onClick={() => onSelectAsB(snap.id)}
								title="Set as Version B"
								className={`inline-flex min-w-[2rem] items-center justify-center rounded-md border px-2 py-1 font-mono text-xs font-semibold transition ${
									isB
										? "border-emerald-400 bg-emerald-950/60 text-emerald-100"
										: "border-slate-600 bg-slate-800/80 text-slate-300 hover:border-emerald-500/60 hover:text-emerald-100"
								}`}
							>
								B
							</button>
							<span className="mx-1 h-4 w-px bg-slate-700" aria-hidden />
							<button
								type="button"
								onClick={() => onLoad(snap)}
								className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100 transition hover:border-slate-400"
							>
								<Upload className="h-3.5 w-3.5" />
								Load
							</button>
							<button
								type="button"
								onClick={() => onDelete(snap.id)}
								className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-400 transition hover:border-rose-700 hover:text-rose-300"
								aria-label={`Delete ${snap.name}`}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</button>
						</div>
					</li>
				);
			})}
		</ul>
	);
};
