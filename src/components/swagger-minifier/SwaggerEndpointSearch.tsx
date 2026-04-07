import { Search } from "lucide-react";
import type { FC } from "react";

type SwaggerEndpointSearchProps = {
	searchQuery: string;
	onSearchQueryChange: (value: string) => void;
	selectedCount: number;
	totalEndpoints: number;
	visibleAllSelected: boolean;
	onToggleSelectAllVisible: () => void;
	canToggleVisible: boolean;
};

export const SwaggerEndpointSearch: FC<SwaggerEndpointSearchProps> = ({
	searchQuery,
	onSearchQueryChange,
	selectedCount,
	totalEndpoints,
	visibleAllSelected,
	onToggleSelectAllVisible,
	canToggleVisible,
}) => (
	<div className="border-b border-slate-700/70 p-3">
		<div className="relative">
			<Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
			<input
				value={searchQuery}
				onChange={(event) => onSearchQueryChange(event.target.value)}
				placeholder="Search path, method, summary..."
				className="w-full rounded-md border border-slate-700 bg-slate-950/90 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none transition focus:border-accent"
			/>
		</div>

		<div className="mt-2 flex items-center justify-between text-xs text-slate-400">
			<span>
				{selectedCount} selected / {totalEndpoints}
			</span>
			<button
				type="button"
				onClick={onToggleSelectAllVisible}
				disabled={!canToggleVisible}
				className="rounded px-2 py-1 text-sky-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600"
			>
				{visibleAllSelected ? "Unselect visible" : "Select visible"}
			</button>
		</div>
	</div>
);
