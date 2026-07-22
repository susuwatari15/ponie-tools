import type { FC } from "react";
import { Card, CardHeader, Input, Select } from "@/components/ui";
import { UNIT_OPTIONS } from "../_constants/units";
import type { UseEpochConverter } from "../_hooks/useEpochConverter";
import type { EpochUnit } from "../_lib/epoch";
import { ResultRow } from "./ResultRow";

export const EpochToDateCard: FC<{ m: UseEpochConverter }> = ({ m }) => (
	<Card flush>
		<CardHeader
			eyebrow="// epoch → date"
			title="Convert Epoch to Human-Readable Date"
			description="Supports seconds, milliseconds, microseconds, and nanoseconds."
		/>
		<div className="space-y-4 p-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<Input
					mono
					inputMode="numeric"
					placeholder="e.g. 1784734724"
					value={m.epochInput}
					onChange={(e) => m.setEpochInput(e.target.value)}
					aria-label="Unix timestamp"
					className="flex-1 text-lg"
				/>
				<Select
					value={m.unit}
					onChange={(e) => m.setUnit(e.target.value as EpochUnit)}
					aria-label="Timestamp resolution"
					className="sm:w-48"
				>
					{UNIT_OPTIONS.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</Select>
			</div>

			{m.dateResult ? (
				<div className="space-y-2">
					<ResultRow
						label="UTC"
						value={m.dateResult.utc}
						onCopy={() => m.copy(m.dateResult!.utc, "Copied UTC time")}
						accent
					/>
					<ResultRow
						label="Local Time"
						value={m.dateResult.local}
						onCopy={() => m.copy(m.dateResult!.local, "Copied local time")}
					/>
					<ResultRow
						label="ISO 8601"
						value={m.dateResult.iso}
						onCopy={() => m.copy(m.dateResult!.iso, "Copied ISO 8601")}
					/>
					<ResultRow
						label="RFC 2822"
						value={m.dateResult.rfc}
						onCopy={() => m.copy(m.dateResult!.rfc, "Copied RFC 2822")}
					/>
					<ResultRow
						label="Relative"
						value={m.dateResult.relative}
						onCopy={() => m.copy(m.dateResult!.relative)}
					/>
				</div>
			) : (
				<p className="text-sm text-muted">
					Enter a numeric timestamp to see the converted date.
				</p>
			)}
		</div>
	</Card>
);
