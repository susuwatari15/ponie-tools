import { Search } from "lucide-react";
import type { FC } from "react";
import { panelClasses } from "../styles";

type CompareSummary = {
	group1: number;
	group2: number;
	common: number;
	only1: number;
	only2: number;
};

type PermissionDiffSummaryToolbarProps = {
	group1Label: string;
	group2Label: string;
	summary: CompareSummary;
	searchQuery: string;
	onSearchChange: (value: string) => void;
};

export const PermissionDiffSummaryToolbar: FC<PermissionDiffSummaryToolbarProps> = ({
	group1Label,
	group2Label,
	summary,
	searchQuery,
	onSearchChange,
}) => {
	return (
		<div className={`sticky top-0 z-10 rounded-xl border px-4 py-3 ${panelClasses}`}>
			<div className="flex flex-wrap items-center gap-2 text-sm">
				<span className="rounded-full border border-current/20 px-2 py-0.5">
					{group1Label}: {summary.group1}
				</span>
				<span className="rounded-full border border-current/20 px-2 py-0.5">
					{group2Label}: {summary.group2}
				</span>
				<span className="rounded-full border border-current/20 px-2 py-0.5 text-blue-700 dark:text-blue-300">
					Common: {summary.common}
				</span>
				<span className="rounded-full border border-current/20 px-2 py-0.5 text-rose-700 dark:text-rose-300">
					Only in G1: {summary.only1}
				</span>
				<span className="rounded-full border border-current/20 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
					Only in G2: {summary.only2}
				</span>
			</div>
			<label className="mt-3 flex items-center gap-2 rounded-md border border-slate-300 px-2.5 py-2 dark:border-slate-500/40">
				<Search size={14} className="text-slate-500 dark:text-slate-400" />
				<input
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Filter visible permissions..."
					className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
				/>
			</label>
		</div>
	);
};
