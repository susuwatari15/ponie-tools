import { HardDrive } from "lucide-react";
import type { FC } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { formatBytes } from "../_lib/formatBytes";
import type { SettingsController } from "../_hooks/useSettings";

const Stat: FC<{ label: string; value: string; detail?: string }> = ({ label, value, detail }) => (
	<div className="rounded-lg border border-line bg-raised/50 px-3 py-2">
		<p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
		<p className="mt-0.5 text-lg font-semibold text-fg">{value}</p>
		{detail ? <p className="text-[11px] text-muted">{detail}</p> : null}
	</div>
);

export const StorageCard: FC<{ m: SettingsController }> = ({ m }) => {
	const { summary } = m;
	const share =
		summary?.usage != null && summary.quota
			? Math.min(100, (summary.usage / summary.quota) * 100)
			: null;

	return (
		<Card flush>
			<CardHeader
				eyebrow="// storage"
				title="What's stored in this browser"
				description="Everything lives in this browser's IndexedDB — nothing is sent to a server."
				actions={<HardDrive className="h-4 w-4 text-muted" aria-hidden />}
			/>
			<div className="space-y-3 p-4">
				{summary ? (
					<>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							<Stat
								label="Snapshots"
								value={String(summary.snapshots)}
								detail={formatBytes(summary.snapshotChars)}
							/>
							<Stat label="Profiles" value={String(summary.profiles)} />
							<Stat label="Presets" value={String(summary.presets)} />
							<Stat
								label="Minifier draft"
								value={summary.draftChars ? formatBytes(summary.draftChars) : "—"}
							/>
						</div>
						{share !== null && summary.usage !== null && summary.quota !== null ? (
							<div>
								<div className="flex justify-between text-[11px] text-muted">
									<span>{formatBytes(summary.usage)} used by this site</span>
									<span>{formatBytes(summary.quota)} available</span>
								</div>
								<div
									className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"
									role="meter"
									aria-label="Browser storage used"
									aria-valuemin={0}
									aria-valuemax={100}
									aria-valuenow={Math.round(share)}
								>
									<div
										className="h-full rounded-full bg-accent"
										style={{ width: `${Math.max(share, 1)}%` }}
									/>
								</div>
							</div>
						) : null}
					</>
				) : (
					<SkeletonGroup label="Reading storage usage" className="space-y-3">
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{Array.from({ length: 4 }, (_, index) => (
								<Skeleton key={index} className="h-[4.25rem] rounded-lg" />
							))}
						</div>
						<Skeleton className="h-1.5 w-full rounded-full" />
					</SkeletonGroup>
				)}
			</div>
		</Card>
	);
};
