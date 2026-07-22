import { format } from "date-fns";
import { Trash2, Upload } from "lucide-react";
import type { FC } from "react";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Layers } from "lucide-react";
import type { SavedSnapshot } from "@/lib/swaggerSavedSnapshotsStorage";

type SwaggerSnapshotListProps = {
	snapshots: SavedSnapshot[];
	selectedIdA: string;
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
			<EmptyState
				icon={Layers}
				title="No snapshots yet"
				description={'Use the Swagger Minifier and "Save snapshot" to store a version here.'}
			/>
		);
	}

	return (
		<ul className="scroll-ide max-h-[70vh] space-y-2 overflow-y-auto">
			{snapshots.map((snap) => {
				const isA = selectedIdA === snap.id;
				const isB = selectedIdB === snap.id;

				return (
					<li
						key={snap.id}
						className={cn(
							"rounded-card border bg-surface p-3 shadow-card transition",
							isA || isB ? "border-accent/40" : "border-line",
						)}
					>
						<div className="flex min-w-0 items-center gap-2">
							{snap.profileColor ? (
								<span
									className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
									style={{ backgroundColor: snap.profileColor }}
									title={snap.profileName ?? "Profile"}
								/>
							) : null}
							<span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
								{snap.name}
							</span>
						</div>
						<div className="mt-0.5 font-mono text-[11px] text-muted">
							{format(new Date(snap.createdAt), "yyyy-MM-dd HH:mm:ss")}
						</div>

						<div className="mt-2.5 flex flex-wrap items-center gap-1.5">
							<button
								type="button"
								onClick={() => onSelectAsA(snap.id)}
								title="Set as baseline (A)"
								aria-pressed={isA}
								className={cn(
									"inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md border px-2 font-mono text-xs font-semibold transition",
									isA
										? "border-rose-400 bg-rose-500/15 text-rose-600 dark:text-rose-300"
										: "border-line text-muted hover:border-rose-400 hover:text-rose-500",
								)}
							>
								A
							</button>
							<button
								type="button"
								onClick={() => onSelectAsB(snap.id)}
								title="Set as compare target (B)"
								aria-pressed={isB}
								className={cn(
									"inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md border px-2 font-mono text-xs font-semibold transition",
									isB
										? "border-emerald-400 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
										: "border-line text-muted hover:border-emerald-400 hover:text-emerald-500",
								)}
							>
								B
							</button>
							<span className="mx-1 h-4 w-px bg-line" aria-hidden />
							<button
								type="button"
								onClick={() => onLoad(snap)}
								className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2 text-xs text-fg transition hover:border-muted/50 hover:bg-raised"
							>
								<Upload className="h-3.5 w-3.5" />
								Load
							</button>
							<IconButton
								label={`Delete ${snap.name}`}
								tone="danger"
								className="h-7 w-7"
								onClick={() => onDelete(snap.id)}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</IconButton>
						</div>
					</li>
				);
			})}
		</ul>
	);
};
