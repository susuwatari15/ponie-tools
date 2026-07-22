import type { FC } from "react";
import { Card, CardHeader, Input, Select } from "@/components/ui";
import type { UseEpochConverter } from "../_hooks/useEpochConverter";
import type { PeriodUnit } from "../_lib/epoch";
import { ResultRow } from "./ResultRow";
import { ZoneToggle } from "./ZoneToggle";

const PERIOD_OPTIONS: { value: PeriodUnit; label: string }[] = [
	{ value: "day", label: "Day" },
	{ value: "month", label: "Month" },
	{ value: "year", label: "Year" },
];

export const PeriodBoundariesCard: FC<{ m: UseEpochConverter }> = ({ m }) => (
	<Card flush>
		<CardHeader
			eyebrow="// period"
			title="Time Period Boundaries"
			description="Get the start and end epoch for a whole day, month, or year."
		/>
		<div className="space-y-4 p-4">
			<div className="flex flex-wrap items-end gap-3">
				<label className="flex flex-col gap-1">
					<span className="font-mono text-[10px] uppercase tracking-widest text-muted">
						Reference date
					</span>
					<Input
						type="date"
						value={m.periodDate}
						onChange={(e) => m.setPeriodDate(e.target.value)}
						aria-label="Reference date"
						className="w-44"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="font-mono text-[10px] uppercase tracking-widest text-muted">
						Period
					</span>
					<Select
						value={m.periodUnit}
						onChange={(e) => m.setPeriodUnit(e.target.value as PeriodUnit)}
						aria-label="Period granularity"
						className="w-32"
					>
						{PERIOD_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</Select>
				</label>
			</div>

			<ZoneToggle
				label="Compute boundaries in"
				value={m.periodZone}
				onChange={m.setPeriodZone}
			/>

			{m.periodResult ? (
				<div className="space-y-2">
					<ResultRow
						label="Start (seconds)"
						value={String(m.periodResult.startEpoch)}
						onCopy={() =>
							m.copy(String(m.periodResult!.startEpoch), "Copied start epoch")
						}
						accent
					/>
					<ResultRow
						label="End (seconds)"
						value={String(m.periodResult.endEpoch)}
						onCopy={() =>
							m.copy(String(m.periodResult!.endEpoch), "Copied end epoch")
						}
						accent
					/>
				</div>
			) : (
				<p className="text-sm text-muted">
					Pick a valid reference date to compute the period boundaries.
				</p>
			)}
		</div>
	</Card>
);
