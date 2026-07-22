import { ChevronDown } from "lucide-react";
import type { FC, ReactNode } from "react";
import { cn } from "./cn";

export type CollapsibleProps = {
	open: boolean;
	onToggle: () => void;
	title: ReactNode;
	description?: ReactNode;
	/** Rendered on the header's right, outside the toggle button. */
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
};

/** A card-framed section with an animated show/hide body. */
export const Collapsible: FC<CollapsibleProps> = ({
	open,
	onToggle,
	title,
	description,
	actions,
	children,
	className,
}) => (
	<section
		className={cn(
			"overflow-hidden rounded-card border border-line bg-surface shadow-card",
			className,
		)}
	>
		<div className="flex items-center justify-between gap-3 px-4 py-3">
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={open}
				className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
			>
				<ChevronDown
					className={cn(
						"h-4 w-4 shrink-0 text-muted transition-transform duration-200",
						open ? "rotate-0" : "-rotate-90",
					)}
				/>
				<span className="min-w-0">
					<span className="block truncate text-sm font-semibold text-fg">
						{title}
					</span>
					{description ? (
						<span className="block truncate text-xs text-muted">
							{description}
						</span>
					) : null}
				</span>
			</button>
			{actions ? (
				<div className="flex shrink-0 flex-wrap items-center gap-1.5">
					{actions}
				</div>
			) : null}
		</div>
		<div
			className="grid transition-[grid-template-rows] duration-300 ease-out"
			style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
		>
			<div className="overflow-hidden">
				<div className="border-t border-line px-4 py-3">{children}</div>
			</div>
		</div>
	</section>
);
