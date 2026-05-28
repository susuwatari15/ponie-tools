import { format } from "date-fns";
import { Trash2, Upload } from "lucide-react";
import type { FC } from "react";
import type { SavedSnapshot } from "@/lib/swaggerSavedSnapshotsStorage";

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
			<p className="text-sm text-slate-600 dark:text-slate-500">
				No snapshots yet. Use Swagger Minifier and &quot;Save snapshot&quot; to store a version
				here.
			</p>
		);
	}

	return (
		<ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white/90 dark:divide-slate-700/80 dark:border-slate-700/80 dark:bg-slate-950/40">
			{snapshots.map((snap) => {
				const isA = selectedIdA === snap.id;
				const isB = selectedIdB === snap.id;

				return (
					<li
						key={snap.id}
						className={`flex flex-col gap-2 px-3 py-2.5 text-sm transition ${
							isA || isB ? "bg-slate-100/90 dark:bg-slate-800/40" : ""
						}`}
					>
						<div className="flex flex-wrap items-start justify-between gap-2">
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<span className="truncate font-medium text-slate-900 dark:text-slate-100">
										{snap.name}
									</span>
									{isA ? (
										<span className="shrink-0 rounded border border-rose-400 bg-rose-100 px-1.5 py-px font-mono text-[10px] font-semibold uppercase text-rose-800 dark:border-rose-500/50 dark:bg-rose-950/50 dark:text-rose-200">
											A
										</span>
									) : null}
									{isB ? (
										<span className="shrink-0 rounded border border-emerald-400 bg-emerald-100 px-1.5 py-px font-mono text-[10px] font-semibold uppercase text-emerald-800 dark:border-emerald-500/50 dark:bg-emerald-950/50 dark:text-emerald-200">
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
										? "border-rose-400 bg-rose-100 text-rose-900 dark:border-rose-400 dark:bg-rose-950/60 dark:text-rose-100"
										: "border-slate-300 bg-white text-slate-700 hover:border-rose-400 hover:text-rose-800 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-rose-500/60 dark:hover:text-rose-100"
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
										? "border-emerald-400 bg-emerald-100 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-100"
										: "border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:text-emerald-800 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-emerald-500/60 dark:hover:text-emerald-100"
								}`}
							>
								B
							</button>
							<span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-700" aria-hidden />
							<button
								type="button"
								onClick={() => onLoad(snap)}
								className="inline-flex items-center gap-1 rounded-md border border-slate-400 bg-slate-100 px-2 py-1 text-xs text-slate-800 transition hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-400"
							>
								<Upload className="h-3.5 w-3.5" />
								Load
							</button>
							<button
								type="button"
								onClick={() => onDelete(snap.id)}
								className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 transition hover:border-rose-400 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-rose-700 dark:hover:text-rose-300"
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
