import type { FC } from "react";
import { Card, CardHeader, Input } from "@/components/ui";
import type { UseEpochConverter } from "../_hooks/useEpochConverter";
import type { DateParts } from "../_lib/epoch";
import { ResultRow } from "./ResultRow";
import { ZoneToggle } from "./ZoneToggle";

const FIELDS: { key: keyof DateParts; label: string; width: string }[] = [
	{ key: "year", label: "Year", width: "w-20" },
	{ key: "month", label: "Month", width: "w-16" },
	{ key: "day", label: "Day", width: "w-16" },
	{ key: "hour", label: "Hour", width: "w-16" },
	{ key: "minute", label: "Min", width: "w-16" },
	{ key: "second", label: "Sec", width: "w-16" },
];

export const DateToEpochCard: FC<{ m: UseEpochConverter }> = ({ m }) => (
	<Card flush>
		<CardHeader
			eyebrow="// date → epoch"
			title="Convert Human-Readable Date to Epoch"
			description="Enter a calendar date and time, then choose how to interpret it."
		/>
		<div className="space-y-4 p-4">
			<div className="flex flex-wrap items-end gap-3">
				{FIELDS.map((field) => (
					<label key={field.key} className="flex flex-col gap-1">
						<span className="font-mono text-[10px] uppercase tracking-widest text-muted">
							{field.label}
						</span>
						<Input
							type="number"
							inputMode="numeric"
							value={m.dateParts[field.key]}
							onChange={(e) => m.setPart(field.key, e.target.value)}
							aria-label={field.label}
							className={`${field.width} text-center`}
						/>
					</label>
				))}
			</div>

			<ZoneToggle
				label="Interpret date as"
				value={m.dateZone}
				onChange={m.setDateZone}
			/>

			{m.dateEpochResult ? (
				<div className="space-y-2">
					<ResultRow
						label="Epoch (seconds)"
						value={String(m.dateEpochResult.seconds)}
						onCopy={() =>
							m.copy(String(m.dateEpochResult!.seconds), "Copied epoch seconds")
						}
						accent
					/>
					<ResultRow
						label="Epoch (milliseconds)"
						value={String(m.dateEpochResult.millis)}
						onCopy={() =>
							m.copy(String(m.dateEpochResult!.millis), "Copied epoch ms")
						}
					/>
				</div>
			) : (
				<p className="text-sm text-muted">
					Fill in every field to compute the epoch timestamp.
				</p>
			)}
		</div>
	</Card>
);
