import type { FC } from "react";
import { Card, CardHeader } from "@/components/ui";
import type { ReferenceRow, UsePxRem } from "../_hooks/usePxRem";
import { formatNumber } from "../_lib/convert";

type TableProps = {
	eyebrow: string;
	title: string;
	fromLabel: string;
	toLabel: string;
	rows: ReferenceRow[];
	/** Render the "from"/"to" cell text for a row. */
	from: (row: ReferenceRow) => string;
	to: (row: ReferenceRow) => string;
	onCopy: (row: ReferenceRow) => void;
};

const ReferenceTable: FC<TableProps> = ({
	eyebrow,
	title,
	fromLabel,
	toLabel,
	rows,
	from,
	to,
	onCopy,
}) => (
	<Card flush>
		<CardHeader eyebrow={eyebrow} title={title} />
		<table className="w-full text-sm">
			<thead>
				<tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-widest text-muted">
					<th className="px-4 py-2 font-normal">{fromLabel}</th>
					<th className="px-4 py-2 font-normal">{toLabel}</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((row, i) => (
					<tr
						key={i}
						onClick={() => onCopy(row)}
						className="cursor-pointer border-b border-line/60 transition last:border-0 hover:bg-raised"
						title="Click to copy the converted value"
					>
						<td className="px-4 py-2 text-muted">{from(row)}</td>
						<td className="px-4 py-2 font-medium text-fg">{to(row)}</td>
					</tr>
				))}
			</tbody>
		</table>
	</Card>
);

export const ReferenceTables: FC<{ m: UsePxRem }> = ({ m }) => (
	<div className="grid gap-4 sm:grid-cols-2">
		<ReferenceTable
			eyebrow="// reference"
			title="Pixels → REM"
			fromLabel="px"
			toLabel="rem"
			rows={m.pxRows}
			from={(r) => `${formatNumber(r.px)}px`}
			to={(r) => `${formatNumber(r.rem)}rem`}
			onCopy={(r) => m.copy(formatNumber(r.rem), "rem")}
		/>
		<ReferenceTable
			eyebrow="// reference"
			title="REM → Pixels"
			fromLabel="rem"
			toLabel="px"
			rows={m.remRows}
			from={(r) => `${formatNumber(r.rem)}rem`}
			to={(r) => `${formatNumber(r.px)}px`}
			onCopy={(r) => m.copy(formatNumber(r.px), "px")}
		/>
	</div>
);
