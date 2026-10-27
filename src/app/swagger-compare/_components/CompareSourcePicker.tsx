"use client";

import { format } from "date-fns";
import { FileUp, Save, X } from "lucide-react";
import type { ChangeEvent, FC } from "react";
import { useRef } from "react";
import { cn } from "@/components/ui/cn";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/ToastProvider";
import type { SwaggerProfile } from "@/lib/swaggerProfilesStorage";
import type { SavedSnapshot } from "@/lib/swaggerSavedSnapshotsStorage";
import { type CompareSide, type SideKey, SOURCE_KINDS } from "../_lib/compareSources";
import { formatSize } from "../_lib/formatSize";

const sideTone: Record<SideKey, string> = {
	a: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
	b: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
};

export const SideBadge: FC<{ side: SideKey; className?: string }> = ({ side, className }) => (
	<span
		className={cn(
			"inline-flex h-4 w-4 shrink-0 items-center justify-center rounded font-mono text-[10px] font-semibold",
			sideTone[side],
			className,
		)}
	>
		{side.toUpperCase()}
	</span>
);

export function snapshotLabel(s: SavedSnapshot): string {
	return `${s.name} — ${format(new Date(s.createdAt), "yyyy-MM-dd HH:mm")}`;
}

type CompareSourcePickerProps = {
	sideKey: SideKey;
	side: CompareSide;
	onChange: (patch: Partial<CompareSide>) => void;
	snapshots: SavedSnapshot[];
	/** Snapshot picked on the other side — disabled here. */
	otherSnapshotId: string;
	profiles: SwaggerProfile[];
	extensionAvailable: boolean;
	minifierSize: number | null;
	/** Set once a compared live / pasted side can be stored as a snapshot. */
	onSaveAsSnapshot?: () => void;
};

export const CompareSourcePicker: FC<CompareSourcePickerProps> = ({
	sideKey,
	side,
	onChange,
	snapshots,
	otherSnapshotId,
	profiles,
	extensionAvailable,
	minifierSize,
	onSaveAsSnapshot,
}) => {
	const { toast } = useToast();
	const fileRef = useRef<HTMLInputElement>(null);
	const title = sideKey === "a" ? "Baseline" : "Compare against";

	const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		try {
			onChange({ pasteText: await file.text(), pasteName: file.name.replace(/\.json$/i, "") });
		} catch {
			toast("Couldn't read that file", "error");
		}
	};

	const selectedProfile = profiles.find((p) => p.id === side.profileId);

	return (
		<div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-line bg-raised/30 p-2">
			<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
				<SideBadge side={sideKey} />
				<span className="text-[11px] font-medium text-muted">{title}</span>
				<div
					className="ml-auto inline-flex rounded-md border border-line bg-raised/60 p-0.5"
					role="radiogroup"
					aria-label={`${title} (${sideKey.toUpperCase()}) source`}
				>
					{SOURCE_KINDS.map(({ value, label, title: kindTitle }) => {
						const active = side.kind === value;
						return (
							<button
								key={value}
								type="button"
								role="radio"
								aria-checked={active}
								title={kindTitle}
								onClick={() => {
									if (!active) onChange({ kind: value });
								}}
								className={cn(
									"rounded px-1.5 py-0.5 text-[11px] font-medium transition",
									active ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
								)}
							>
								{label}
							</button>
						);
					})}
				</div>
			</div>

			{side.kind === "snapshot" ? (
				<Select
					aria-label={`${title} snapshot (${sideKey.toUpperCase()})`}
					className="py-1.5 text-xs"
					value={side.snapshotId}
					onChange={(e) => onChange({ snapshotId: e.target.value })}
					disabled={snapshots.length === 0}
				>
					<option value="">{snapshots.length === 0 ? "No snapshots saved" : "Pick a snapshot…"}</option>
					{snapshots.map((s) => (
						<option key={s.id} value={s.id} disabled={s.id === otherSnapshotId}>
							{snapshotLabel(s)}
						</option>
					))}
				</Select>
			) : null}

			{side.kind === "profile" ? (
				<>
					<Select
						aria-label={`${title} profile (${sideKey.toUpperCase()})`}
						className="py-1.5 text-xs"
						value={side.profileId}
						onChange={(e) => onChange({ profileId: e.target.value })}
						disabled={profiles.length === 0}
						adornment={
							selectedProfile ? (
								<span
									className="h-3 w-3 rounded-full ring-1 ring-black/10"
									style={{ backgroundColor: selectedProfile.color }}
									aria-hidden
								/>
							) : undefined
						}
					>
						<option value="">{profiles.length === 0 ? "No profiles yet" : "Pick a profile…"}</option>
						{profiles.map((p) => (
							<option key={p.id} value={p.id} disabled={!p.url.trim()}>
								{p.name}
								{p.url.trim() ? "" : " (no URL)"}
							</option>
						))}
					</Select>
					<p className="truncate text-[11px] text-muted" title={selectedProfile?.url}>
						{profiles.length === 0
							? "Create a profile in the Minifier to fetch a live spec."
							: `Fetched fresh on Compare${extensionAvailable ? " via the browser extension" : ""}.`}
					</p>
				</>
			) : null}

			{side.kind === "paste" ? (
				<>
					<Textarea
						aria-label={`${title} JSON (${sideKey.toUpperCase()})`}
						rows={3}
						value={side.pasteText}
						onChange={(e) => onChange({ pasteText: e.target.value, pasteName: "" })}
						placeholder="Paste OpenAPI / Swagger JSON…"
						spellCheck={false}
						className="resize-y p-2 text-[11px]"
					/>
					<div className="flex items-center gap-2 text-[11px] text-muted">
						<button
							type="button"
							onClick={() => fileRef.current?.click()}
							className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
						>
							<FileUp className="h-3.5 w-3.5" aria-hidden />
							Upload .json
						</button>
						<input
							ref={fileRef}
							type="file"
							accept=".json,application/json"
							className="hidden"
							onChange={(e) => void handleFile(e)}
						/>
						{side.pasteText ? (
							<>
								<span className="min-w-0 truncate font-mono">
									{side.pasteName ? `${side.pasteName} · ` : ""}
									{formatSize(side.pasteText.length)}
								</span>
								<button
									type="button"
									onClick={() => onChange({ pasteText: "", pasteName: "" })}
									aria-label="Clear pasted JSON"
									className="ml-auto rounded p-0.5 transition hover:text-fg"
								>
									<X className="h-3.5 w-3.5" />
								</button>
							</>
						) : null}
					</div>
				</>
			) : null}

			{side.kind === "minifier" ? (
				<p className="rounded-md border border-dashed border-line px-2 py-1.5 text-[11px] text-muted">
					{minifierSize === null ? (
						"The Minifier has no spec loaded."
					) : (
						<>
							The spec currently in the Minifier ·{" "}
							<span className="font-mono text-fg">{formatSize(minifierSize)}</span>
						</>
					)}
				</p>
			) : null}

			{onSaveAsSnapshot ? (
				<button
					type="button"
					onClick={onSaveAsSnapshot}
					className="inline-flex items-center gap-1 self-start text-[11px] font-medium text-accent hover:underline"
				>
					<Save className="h-3.5 w-3.5" aria-hidden />
					Save as snapshot
				</button>
			) : null}
		</div>
	);
};
