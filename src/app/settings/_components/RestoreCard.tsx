import { TriangleAlert, Upload } from "lucide-react";
import { type FC, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import type { ImportMode } from "@/lib/dataExport";
import type { SettingsController } from "../_hooks/useSettings";

const MODES: { value: ImportMode; label: string; description: string }[] = [
	{
		value: "merge",
		label: "Merge",
		description:
			"Add the backup's snapshots, profiles and presets to what's here. Same-id items take the backup's version.",
	},
	{
		value: "replace",
		label: "Replace",
		description: "Delete everything stored now, then restore the backup exactly.",
	},
];

const RestoreModal: FC<{ m: SettingsController }> = ({ m }) => {
	const pending = m.pendingRestore;
	if (!pending) return null;
	const { parsed } = pending;

	return (
		<Modal
			open
			onClose={m.cancelRestore}
			eyebrow="// restore"
			title={pending.fileName}
			footer={
				<>
					<Button variant="ghost" onClick={m.cancelRestore}>
						Cancel
					</Button>
					{parsed.ok ? (
						<Button
							variant={m.restoreMode === "replace" ? "danger" : "primary"}
							onClick={m.confirmRestore}
							disabled={m.restoring}
							leftIcon={m.restoring ? <Spinner className="text-current" /> : undefined}
						>
							{m.restoreMode === "replace" ? "Replace all data" : "Merge backup"}
						</Button>
					) : null}
				</>
			}
		>
			{parsed.ok ? (
				<div className="space-y-4 text-sm">
					<ul className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
						{[
							["Snapshots", parsed.summary.snapshots],
							["Profiles", parsed.summary.profiles],
							["Passwords", parsed.summary.passwords],
							["Presets", parsed.summary.presets],
						].map(([label, value]) => (
							<li key={label} className="rounded-lg border border-line bg-raised/50 px-2.5 py-1.5">
								<span className="block font-mono text-[10px] uppercase tracking-widest text-muted">
									{label}
								</span>
								<span className="text-base font-semibold text-fg">{value}</span>
							</li>
						))}
					</ul>
					{parsed.summary.exportedAt ? (
						<p className="text-xs text-muted">
							Exported {new Date(parsed.summary.exportedAt).toLocaleString()}
							{parsed.summary.hasDraft ? " · includes a Minifier draft" : ""}
						</p>
					) : null}

					<fieldset className="space-y-2">
						<legend className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
							How to restore
						</legend>
						{MODES.map((mode) => (
							<label
								key={mode.value}
								className={cn(
									"flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 transition",
									m.restoreMode === mode.value
										? "border-accent/60 bg-accent/10"
										: "border-line bg-raised/50 hover:border-muted/50",
								)}
							>
								<input
									type="radio"
									name="restore-mode"
									value={mode.value}
									checked={m.restoreMode === mode.value}
									onChange={() => m.setRestoreMode(mode.value)}
									className="mt-1 h-3.5 w-3.5 shrink-0 border-line text-accent focus:ring-accent"
								/>
								<span>
									<span className="block text-sm font-medium text-fg">{mode.label}</span>
									<span className="block text-xs text-muted">{mode.description}</span>
								</span>
							</label>
						))}
					</fieldset>
				</div>
			) : (
				<p className="flex items-start gap-2 rounded-md border border-del/40 bg-del/10 px-3 py-2 text-sm text-del">
					<TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
					{parsed.error}
				</p>
			)}
		</Modal>
	);
};

export const RestoreCard: FC<{ m: SettingsController }> = ({ m }) => {
	const fileRef = useRef<HTMLInputElement>(null);

	return (
		<Card flush>
			<CardHeader
				eyebrow="// restore"
				title="Restore from a backup"
				description="Pick a backup file — you'll see what's in it and choose to merge or replace before anything changes."
			/>
			<div className="p-4">
				<input
					ref={fileRef}
					type="file"
					accept="application/json,.json"
					className="sr-only"
					aria-label="Backup file"
					onChange={(event) => {
						const file = event.target.files?.[0];
						event.target.value = "";
						if (file) void m.pickRestoreFile(file);
					}}
				/>
				<Button onClick={() => fileRef.current?.click()} leftIcon={<Upload className="h-4 w-4" />}>
					Restore from file…
				</Button>
			</div>
			<RestoreModal m={m} />
		</Card>
	);
};
