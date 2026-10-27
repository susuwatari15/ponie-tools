import type { LucideIcon } from "lucide-react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";
import { cn } from "./cn";

export type SegmentedOption<T extends string> = {
	value: T;
	label: string;
	icon?: LucideIcon;
	/** Trailing hint, e.g. how many items the segment holds. */
	badge?: ReactNode;
};

export type SegmentedControlProps<T extends string> = {
	value: T;
	onChange: (value: T) => void;
	options: SegmentedOption<T>[];
	/** Accessible name of the tab list. */
	label: string;
	/** `md` is the narrow-screen pane switcher: taller, and stretched to fill the row. */
	size?: "sm" | "md";
	/** Show only the icons; labels stay available to screen readers and as tooltips. */
	iconOnly?: boolean;
	className?: string;
};

const sizes = {
	sm: "px-2.5 py-1 text-xs pointer-coarse:min-h-10",
	md: "min-h-10 flex-1 px-3 py-2 text-sm",
} as const;

/**
 * Tab-style segmented control (the minifier output-view toggle look). Arrow
 * keys move between segments. Generic over the value, so it is a plain
 * function rather than an `FC`.
 */
export function SegmentedControl<T extends string>({
	value,
	onChange,
	options,
	label,
	size = "sm",
	iconOnly = false,
	className,
}: SegmentedControlProps<T>): ReactElement {
	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
		event.preventDefault();
		const current = options.findIndex((option) => option.value === value);
		const step = event.key === "ArrowRight" ? 1 : -1;
		const nextIndex = (current + step + options.length) % options.length;
		onChange(options[nextIndex].value);
		event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[nextIndex]?.focus();
	};

	return (
		<div
			role="tablist"
			aria-label={label}
			onKeyDown={onKeyDown}
			className={cn(
				"rounded-lg border border-line bg-raised/60 p-0.5",
				size === "md" ? "flex" : "inline-flex",
				className,
			)}
		>
			{options.map(({ value: optionValue, label: optionLabel, icon: Icon, badge }) => {
				const active = optionValue === value;
				return (
					<button
						key={optionValue}
						type="button"
						role="tab"
						aria-selected={active}
						tabIndex={active ? 0 : -1}
						title={iconOnly ? optionLabel : undefined}
						onClick={() => onChange(optionValue)}
						className={cn(
							"inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
							sizes[size],
							iconOnly && "pointer-coarse:min-w-10",
							active ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
						)}
					>
						{Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
						<span className={iconOnly ? "sr-only" : undefined}>{optionLabel}</span>
						{badge !== undefined && badge !== null ? (
							<span
								className={cn(
									"rounded-full px-1.5 font-mono text-[10px] leading-4",
									active ? "bg-accent/15 text-accent" : "bg-line/70 text-fg",
								)}
							>
								{badge}
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}
