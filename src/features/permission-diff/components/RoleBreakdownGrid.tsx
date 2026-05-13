import type { FC } from "react";
import { mutedText, panelClasses } from "../styles";
import type { RoleBreakdown } from "../types";

type RoleBreakdownGridProps = {
	group1Label: string;
	group2Label: string;
	group1Rows: RoleBreakdown[];
	group2Rows: RoleBreakdown[];
};

export const RoleBreakdownGrid: FC<RoleBreakdownGridProps> = ({
	group1Label,
	group2Label,
	group1Rows,
	group2Rows,
}) => {
	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<div className={`rounded-xl border p-3 ${panelClasses}`}>
				<h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
					{group1Label} role breakdown
				</h4>
				<ul className="mt-2 space-y-1 text-sm">
					{group1Rows.map((row) => (
						<li key={row.name} className="flex items-center justify-between gap-2">
							<span className="truncate">{row.name}</span>
							<span className={`text-xs ${mutedText}`}>{row.count}</span>
						</li>
					))}
				</ul>
			</div>
			<div className={`rounded-xl border p-3 ${panelClasses}`}>
				<h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
					{group2Label} role breakdown
				</h4>
				<ul className="mt-2 space-y-1 text-sm">
					{group2Rows.map((row) => (
						<li key={row.name} className="flex items-center justify-between gap-2">
							<span className="truncate">{row.name}</span>
							<span className={`text-xs ${mutedText}`}>{row.count}</span>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
};
