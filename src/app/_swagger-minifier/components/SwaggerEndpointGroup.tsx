import { ChevronDown } from "lucide-react";
import type { FC, KeyboardEvent, ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import type { EndpointGroup } from "@/lib/endpointFilter";

type SwaggerEndpointGroupProps = {
	group: EndpointGroup;
	selectedCount: number;
	collapsed: boolean;
	onToggleCollapsed: () => void;
	onSetCollapsed: (collapsed: boolean) => void;
	onSetSelected: (selected: boolean) => void;
	/** Roving-tabindex wiring from the parent list. */
	navKey: string;
	tabIndex: number;
	onFocusNav: () => void;
	children: ReactNode;
};

/**
 * A collapsible endpoint group. The header's tri-state checkbox is its keyboard
 * stop: `Space` (de)selects the group, `←/→` collapse/expand, `Enter` toggles.
 */
export const SwaggerEndpointGroup: FC<SwaggerEndpointGroupProps> = ({
	group,
	selectedCount,
	collapsed,
	onToggleCollapsed,
	onSetCollapsed,
	onSetSelected,
	navKey,
	tabIndex,
	onFocusNav,
	children,
}) => {
	const total = group.endpoints.length;
	const allSelected = total > 0 && selectedCount === total;
	const someSelected = selectedCount > 0 && !allSelected;

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			onSetCollapsed(true);
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			onSetCollapsed(false);
		} else if (event.key === "Enter") {
			event.preventDefault();
			onToggleCollapsed();
		}
	};

	return (
		<li>
			<div className="sticky top-0 z-10 flex items-center gap-2 rounded-md bg-surface/95 px-2 py-1.5 backdrop-blur">
				<input
					type="checkbox"
					checked={allSelected}
					ref={(el) => {
						if (el) el.indeterminate = someSelected;
					}}
					onChange={() => onSetSelected(!allSelected)}
					data-nav-key={navKey}
					tabIndex={tabIndex}
					onFocus={onFocusNav}
					onKeyDown={onKeyDown}
					aria-label={`Select all in ${group.label}`}
					className="h-4 w-4 shrink-0 rounded border-line text-accent focus:ring-accent"
				/>
				<button
					type="button"
					onClick={onToggleCollapsed}
					aria-expanded={!collapsed}
					tabIndex={-1}
					className="flex min-w-0 flex-1 items-center gap-1.5 rounded text-left"
				>
					<ChevronDown
						className={cn(
							"h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200",
							collapsed && "-rotate-90",
						)}
						aria-hidden
					/>
					<span className="min-w-0 truncate font-mono text-xs font-semibold text-fg">
						{group.label}
					</span>
					<span
						className={cn(
							"ml-auto shrink-0 font-mono text-[11px]",
							selectedCount > 0 ? "text-accent" : "text-muted",
						)}
					>
						{selectedCount}/{total}
					</span>
				</button>
			</div>
			{collapsed ? null : <ul className="mt-1 space-y-1.5 pl-2">{children}</ul>}
		</li>
	);
};
