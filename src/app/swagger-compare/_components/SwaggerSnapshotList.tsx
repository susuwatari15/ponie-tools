import { format } from "date-fns";
import { Download, FolderTree, GitCompare, Layers, Pencil, Search, Trash2, Upload } from "lucide-react";
import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import type { SavedSnapshot } from "@/lib/swaggerSavedSnapshotsStorage";
import { formatSize } from "../_lib/formatSize";
import type { StorageEstimate, SwaggerCompareController } from "../_hooks/useSwaggerCompare";

/** Browser storage use above this share of the quota is flagged. */
const STORAGE_WARN_RATIO = 0.8;

/** How long the bulk-delete button waits for its confirming second click. */
const CONFIRM_TIMEOUT_MS = 4_000;

const sideButton =
	"inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md border px-2 font-mono text-xs font-semibold transition pointer-coarse:min-h-10 pointer-coarse:min-w-10";

const checkbox = "h-3.5 w-3.5 shrink-0 rounded border-line text-accent focus:ring-accent";

type SnapshotGroup = { key: string; name: string; color?: string; items: SavedSnapshot[] };

/** Groups by profile, keeping the list order inside each group; snapshots without one go last. */
function groupByProfile(snapshots: SavedSnapshot[]): SnapshotGroup[] {
	const groups = new Map<string, SnapshotGroup>();
	for (const snap of snapshots) {
		const key = snap.profileName ?? "";
		const group = groups.get(key) ?? {
			key,
			name: snap.profileName ?? "No profile",
			color: snap.profileColor,
			items: [],
		};
		group.items.push(snap);
		groups.set(key, group);
	}
	return [...groups.values()].sort((a, b) => Number(a.key === "") - Number(b.key === ""));
}

type SnapshotRowProps = {
	snap: SavedSnapshot;
	m: SwaggerCompareController;
	checked: boolean;
	onToggleChecked: () => void;
};

const SnapshotRow: FC<SnapshotRowProps> = ({ snap, m, checked, onToggleChecked }) => {
	const [draft, setDraft] = useState<string | null>(null);
	const isA = m.sideA.kind === "snapshot" && m.sideA.snapshotId === snap.id;
	const isB = m.sideB.kind === "snapshot" && m.sideB.snapshotId === snap.id;
	const isLatest = m.latestSnapshot?.id === snap.id;

	const commitRename = () => {
		if (draft !== null && draft.trim() && draft.trim() !== snap.name) {
			void m.renameSnapshot(snap.id, draft);
		}
		setDraft(null);
	};

	return (
		<li
			className={cn(
				"group rounded-card border bg-surface p-3 shadow-card transition",
				isA || isB ? "border-accent/40" : "border-line",
			)}
		>
			<div className="flex min-w-0 items-center gap-2">
				<input
					type="checkbox"
					checked={checked}
					onChange={onToggleChecked}
					aria-label={`Select ${snap.name}`}
					className={checkbox}
				/>
				{snap.profileColor ? (
					<span
						className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
						style={{ backgroundColor: snap.profileColor }}
						title={snap.profileName ?? "Profile"}
					/>
				) : null}
				{draft !== null ? (
					<input
						autoFocus
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onBlur={commitRename}
						onKeyDown={(e) => {
							if (e.key === "Enter") commitRename();
							if (e.key === "Escape") setDraft(null);
						}}
						aria-label="Snapshot name"
						maxLength={120}
						className="min-w-0 flex-1 rounded border border-accent bg-surface px-1.5 py-0.5 text-sm text-fg outline-none ring-2 ring-accent/25"
					/>
				) : (
					<>
						<span
							className="min-w-0 flex-1 truncate text-sm font-medium text-fg"
							title={`${snap.name} — double-click to rename`}
							onDoubleClick={() => setDraft(snap.name)}
						>
							{snap.name}
						</span>
						<button
							type="button"
							onClick={() => setDraft(snap.name)}
							aria-label={`Rename ${snap.name}`}
							className="shrink-0 rounded p-0.5 text-muted opacity-0 transition hover:text-fg focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
						>
							<Pencil className="h-3 w-3" />
						</button>
					</>
				)}
			</div>
			<div className="mt-0.5 pl-[1.375rem] font-mono text-[11px] text-muted">
				{format(new Date(snap.createdAt), "yyyy-MM-dd HH:mm:ss")}
				<span className="text-muted/60" aria-hidden>
					{" · "}
				</span>
				<span className="whitespace-nowrap">{formatSize(snap.size)}</span>
				{isLatest ? <span className="ml-1.5 text-accent">latest</span> : null}
			</div>

			<div className="mt-2.5 flex flex-wrap items-center gap-1">
				<button
					type="button"
					onClick={() => m.selectSnapshotAs("a", snap.id)}
					title="Set as baseline (A)"
					aria-pressed={isA}
					className={cn(
						sideButton,
						isA
							? "border-rose-400 bg-rose-500/15 text-rose-600 dark:text-rose-300"
							: "border-line text-muted hover:border-rose-400 hover:text-rose-500",
					)}
				>
					A
				</button>
				<button
					type="button"
					onClick={() => m.selectSnapshotAs("b", snap.id)}
					title="Set as compare target (B)"
					aria-pressed={isB}
					className={cn(
						sideButton,
						isB
							? "border-emerald-400 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
							: "border-line text-muted hover:border-emerald-400 hover:text-emerald-500",
					)}
				>
					B
				</button>
				<span className="mx-1 h-4 w-px bg-line" aria-hidden />
				<IconButton
					label="Compare with the latest snapshot"
					className="h-7 w-7"
					disabled={isLatest || !m.latestSnapshot}
					onClick={() => m.compareWithLatest(snap)}
				>
					<GitCompare className="h-3.5 w-3.5" />
				</IconButton>
				<IconButton
					label="Load into the Minifier"
					className="h-7 w-7"
					onClick={() => void m.loadIntoMinifier(snap)}
				>
					<Upload className="h-3.5 w-3.5" />
				</IconButton>
				<IconButton
					label="Download JSON"
					className="h-7 w-7"
					onClick={() => void m.downloadSnapshot(snap)}
				>
					<Download className="h-3.5 w-3.5" />
				</IconButton>
				<IconButton
					label={`Delete ${snap.name}`}
					tone="danger"
					className="h-7 w-7"
					onClick={() => void m.deleteSnapshots([snap.id])}
				>
					<Trash2 className="h-3.5 w-3.5" />
				</IconButton>
			</div>
		</li>
	);
};

const StorageFooter: FC<{ snapshots: SavedSnapshot[]; estimate: StorageEstimate | null }> = ({
	snapshots,
	estimate,
}) => {
	const total = snapshots.reduce((sum, snap) => sum + snap.size, 0);
	const ratio = estimate ? estimate.usage / estimate.quota : 0;
	const warn = ratio > STORAGE_WARN_RATIO;

	return (
		<div className="rounded-lg border border-line bg-raised/40 px-3 py-2 text-[11px] text-muted">
			<div className="flex items-center justify-between gap-2">
				<span>
					{snapshots.length} snapshot{snapshots.length === 1 ? "" : "s"}
				</span>
				<span className="font-mono text-fg">{formatSize(total)}</span>
			</div>
			{estimate ? (
				<>
					<div
						className="mt-1.5 h-1 overflow-hidden rounded-full bg-line"
						role="meter"
						aria-label="Browser storage used"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={Math.round(ratio * 100)}
					>
						<div
							className={cn("h-full rounded-full", warn ? "bg-amber-500" : "bg-accent")}
							style={{ width: `${Math.min(100, Math.max(1, ratio * 100))}%` }}
						/>
					</div>
					<p className="mt-1">
						Browser storage: <span className="font-mono">{formatSize(estimate.usage)}</span> of{" "}
						<span className="font-mono">{formatSize(estimate.quota)}</span> (
						{(ratio * 100).toFixed(ratio < 0.01 ? 2 : 0)}%)
					</p>
					{warn ? (
						<p className="mt-1 text-amber-700 dark:text-amber-300">
							Storage is over {STORAGE_WARN_RATIO * 100}% full — delete old snapshots to make room.
						</p>
					) : null}
				</>
			) : null}
		</div>
	);
};

export const SwaggerSnapshotList: FC<{ m: SwaggerCompareController }> = ({ m }) => {
	const { snapshots } = m;
	const [query, setQuery] = useState("");
	const [grouped, setGrouped] = useState(false);
	const [checked, setChecked] = useState<Set<string>>(new Set());
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	const q = query.trim().toLowerCase();
	const shown = useMemo(
		() =>
			q
				? snapshots.filter(
						(snap) =>
							snap.name.toLowerCase().includes(q) ||
							(snap.profileName ?? "").toLowerCase().includes(q) ||
							snap.createdAt.includes(q),
					)
				: snapshots,
		[snapshots, q],
	);
	const groups = useMemo(() => (grouped ? groupByProfile(shown) : null), [grouped, shown]);

	// Ticks only ever refer to snapshots that still exist.
	const existing = useMemo(() => new Set(snapshots.map((s) => s.id)), [snapshots]);
	const checkedIds = [...checked].filter((id) => existing.has(id));
	const shownChecked = shown.filter((snap) => checked.has(snap.id)).length;

	useEffect(() => {
		if (!confirmingDelete) return;
		const timer = window.setTimeout(() => setConfirmingDelete(false), CONFIRM_TIMEOUT_MS);
		return () => window.clearTimeout(timer);
	}, [confirmingDelete]);

	const toggle = (id: string) =>
		setChecked((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	const toggleAllShown = () =>
		setChecked((prev) => {
			const next = new Set(prev);
			const allOn = shown.every((snap) => next.has(snap.id));
			for (const snap of shown) {
				if (allOn) next.delete(snap.id);
				else next.add(snap.id);
			}
			return next;
		});

	const bulkDelete = () => {
		if (!confirmingDelete) {
			setConfirmingDelete(true);
			return;
		}
		setConfirmingDelete(false);
		setChecked(new Set());
		void m.deleteSnapshots(checkedIds);
	};

	if (!m.snapshotsLoaded) {
		return (
			<SkeletonGroup label="Loading snapshots" className="flex flex-col gap-2">
				<Skeleton className="h-8 w-full rounded-lg" />
				{Array.from({ length: 4 }, (_, index) => (
					<Skeleton key={index} className="h-[5.5rem] w-full rounded-card" />
				))}
			</SkeletonGroup>
		);
	}

	if (snapshots.length === 0) {
		return (
			<EmptyState
				icon={Layers}
				title="No snapshots yet"
				description={
					'Use "Save snapshot" in the Swagger Minifier, or compare a live / pasted spec and save it from here.'
				}
			/>
		);
	}

	const renderRow = (snap: SavedSnapshot) => (
		<SnapshotRow
			key={snap.id}
			snap={snap}
			m={m}
			checked={checked.has(snap.id)}
			onToggleChecked={() => toggle(snap.id)}
		/>
	);

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-2">
			<div className="flex items-center gap-1.5">
				<div className="min-w-0 flex-1">
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Escape") setQuery("");
						}}
						placeholder="Search snapshots…"
						icon={<Search className="h-3.5 w-3.5" />}
						aria-label="Search snapshots"
						className="!py-1.5 !text-xs"
					/>
				</div>
				<IconButton
					label={grouped ? "Show as one list" : "Group by profile"}
					aria-pressed={grouped}
					onClick={() => setGrouped((value) => !value)}
					className={cn(grouped && "border-accent/50 text-accent")}
				>
					<FolderTree className="h-3.5 w-3.5" />
				</IconButton>
			</div>

			<div className="flex min-h-[1.75rem] items-center gap-2 px-1 text-[11px] text-muted">
				<input
					type="checkbox"
					checked={shown.length > 0 && shownChecked === shown.length}
					ref={(el) => {
						if (el) el.indeterminate = shownChecked > 0 && shownChecked < shown.length;
					}}
					onChange={toggleAllShown}
					disabled={shown.length === 0}
					aria-label="Select all shown snapshots"
					className={checkbox}
				/>
				{checkedIds.length > 0 ? (
					<>
						<span>
							<span className="font-mono text-fg">{checkedIds.length}</span> selected
						</span>
						<button
							type="button"
							onClick={bulkDelete}
							className={cn(
								"ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium transition",
								confirmingDelete
									? "border-del bg-del/15 text-del"
									: "border-line text-muted hover:border-del/60 hover:text-del",
							)}
						>
							<Trash2 className="h-3 w-3" aria-hidden />
							{confirmingDelete ? `Confirm delete ${checkedIds.length}` : "Delete"}
						</button>
						<button
							type="button"
							onClick={() => {
								setChecked(new Set());
								setConfirmingDelete(false);
							}}
							className="font-medium text-accent hover:underline"
						>
							Clear
						</button>
					</>
				) : (
					<span>
						{q ? `${shown.length} of ${snapshots.length}` : snapshots.length} · newest first
					</span>
				)}
			</div>

			<div className="scroll-ide max-h-[70vh] min-h-0 flex-1 overflow-y-auto pr-1 lg:max-h-none">
				{shown.length === 0 ? (
					<p className="px-2 py-6 text-center text-xs text-muted">No snapshot matches “{query.trim()}”.</p>
				) : groups ? (
					<div className="space-y-3">
						{groups.map((group) => (
							<section key={group.key}>
								<h4 className="mb-1.5 flex items-center gap-1.5 px-1 font-mono text-[10px] uppercase tracking-widest text-muted">
									{group.color ? (
										<span
											className="h-2 w-2 rounded-full ring-1 ring-black/10"
											style={{ backgroundColor: group.color }}
											aria-hidden
										/>
									) : null}
									<span className="min-w-0 truncate">{group.name}</span>
									<span className="text-accent">{group.items.length}</span>
								</h4>
								<ul className="space-y-2">{group.items.map(renderRow)}</ul>
							</section>
						))}
					</div>
				) : (
					<ul className="space-y-2">{shown.map(renderRow)}</ul>
				)}
			</div>

			<StorageFooter snapshots={snapshots} estimate={m.storageEstimate} />
		</div>
	);
};
