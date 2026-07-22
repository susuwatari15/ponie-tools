import type { FC } from "react";
import { Card } from "@/components/ui/Card";
import type { RoleBreakdown } from "../types";

type RoleBreakdownGridProps = {
	group1Label: string;
	group2Label: string;
	group1Rows: RoleBreakdown[];
	group2Rows: RoleBreakdown[];
};

const Column: FC<{ label: string; rows: RoleBreakdown[] }> = ({ label, rows }) => (
	<Card>
		<h4 className="text-sm font-semibold text-fg">{label} role breakdown</h4>
		<ul className="mt-2 space-y-1 text-sm">
			{rows.map((row) => (
				<li key={row.name} className="flex items-center justify-between gap-2">
					<span className="min-w-0 truncate text-fg/90">{row.name}</span>
					<span className="font-mono text-xs text-muted">{row.count}</span>
				</li>
			))}
		</ul>
	</Card>
);

export const RoleBreakdownGrid: FC<RoleBreakdownGridProps> = ({
	group1Label,
	group2Label,
	group1Rows,
	group2Rows,
}) => (
	<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<Column label={group1Label} rows={group1Rows} />
		<Column label={group2Label} rows={group2Rows} />
	</div>
);
