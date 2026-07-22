import { Search } from "lucide-react";
import type { FC } from "react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

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
		<div className="sticky top-14 z-10 rounded-card border border-line bg-surface/95 px-4 py-3 shadow-card backdrop-blur">
			<div className="flex flex-wrap items-center gap-2">
				<Badge tone="neutral">
					{group1Label}: <span className="font-mono">{summary.group1}</span>
				</Badge>
				<Badge tone="neutral">
					{group2Label}: <span className="font-mono">{summary.group2}</span>
				</Badge>
				<Badge tone="post">
					Common: <span className="font-mono">{summary.common}</span>
				</Badge>
				<Badge tone="del">
					Only in G1: <span className="font-mono">{summary.only1}</span>
				</Badge>
				<Badge tone="get">
					Only in G2: <span className="font-mono">{summary.only2}</span>
				</Badge>
			</div>
			<div className="mt-3">
				<Input
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Filter visible permissions…"
					icon={<Search className="h-4 w-4" />}
					aria-label="Filter permissions"
				/>
			</div>
		</div>
	);
};
