import type { FC, ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { RESULTS_PAGE_SIZE } from "../_hooks/useCompareResultsView";

export type SectionTone = "get" | "del" | "put";

const toneClasses: Record<SectionTone, string> = {
	get: "text-emerald-600 dark:text-emerald-300",
	del: "text-rose-600 dark:text-rose-300",
	put: "text-amber-700 dark:text-amber-200",
};

type CompareResultSectionProps = {
	title: string;
	count: number;
	tone: SectionTone;
	/** Rendered rows are `[start, end)`; paging bars appear for whatever lies outside. */
	start: number;
	end: number;
	onShowPrevious: () => void;
	onShowNext: () => void;
	onShowAll: () => void;
	/** Expand/collapse-all controls, for sections whose rows carry a diff. */
	onExpandAll?: () => void;
	onCollapseAll?: () => void;
	description?: ReactNode;
	children: ReactNode;
};

export const CompareResultSection: FC<CompareResultSectionProps> = ({
	title,
	count,
	tone,
	start,
	end,
	onShowPrevious,
	onShowNext,
	onShowAll,
	onExpandAll,
	onCollapseAll,
	description,
	children,
}) => {
	const after = count - end;
	const pagingBar =
		"flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border border-dashed border-line px-3 py-2 text-xs text-muted";
	const pagingButton = "font-medium text-accent hover:underline";
	const position = (
		<span>
			Showing{" "}
			<span className="font-mono text-fg">
				{start + 1}–{end}
			</span>{" "}
			of {count}
		</span>
	);

	return (
		<section>
			<div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
				<h3 className={cn("flex items-center gap-2 text-sm font-semibold", toneClasses[tone])}>
					{title}
					<span className="rounded-full border border-current/30 px-2 py-0.5 text-xs">
						{count}
					</span>
				</h3>
				{onExpandAll && onCollapseAll ? (
					<span className="ml-auto flex items-center gap-2 text-[11px]">
						<button
							type="button"
							onClick={onExpandAll}
							className="font-medium text-accent hover:underline"
						>
							Expand all
						</button>
						<span className="text-line">|</span>
						<button
							type="button"
							onClick={onCollapseAll}
							className="font-medium text-accent hover:underline"
						>
							Collapse all
						</button>
					</span>
				) : null}
			</div>
			{description ? <p className="mb-2 text-xs text-muted">{description}</p> : null}
			{start > 0 ? (
				<div className={cn(pagingBar, "mb-2")}>
					{position}
					<button type="button" onClick={onShowPrevious} className={pagingButton}>
						Show {Math.min(RESULTS_PAGE_SIZE, start)} previous
					</button>
				</div>
			) : null}
			{children}
			{after > 0 ? (
				<div className={cn(pagingBar, "mt-2")}>
					{position}
					<button type="button" onClick={onShowNext} className={pagingButton}>
						Show {Math.min(RESULTS_PAGE_SIZE, after)} more
					</button>
					{start > 0 || after > RESULTS_PAGE_SIZE ? (
						<>
							<span className="text-line">|</span>
							<button type="button" onClick={onShowAll} className={pagingButton}>
								Show all {count}
							</button>
						</>
					) : null}
				</div>
			) : null}
		</section>
	);
};
