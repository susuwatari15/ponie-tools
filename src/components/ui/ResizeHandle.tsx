import type { FC } from "react";
import { cn } from "./cn";
import type { ResizeHandleProps as ResizeHandleBindings } from "./useResizableSplit";

export type ResizeHandleProps = ResizeHandleBindings & {
	/** Accessible name, e.g. "Resize input panel". */
	label: string;
	className?: string;
};

/**
 * Vertical drag handle for a `useResizableSplit` layout. Drag or use ←/→ to
 * resize; double-click restores the default size.
 */
export const ResizeHandle: FC<ResizeHandleProps> = ({
	label,
	className,
	dragging,
	valueNow,
	valueMin,
	valueMax,
	...handlers
}) => (
	<div
		role="separator"
		aria-orientation="vertical"
		aria-label={label}
		aria-valuenow={valueNow}
		aria-valuemin={valueMin}
		aria-valuemax={valueMax}
		tabIndex={0}
		title={`${label} — drag, or double-click to reset`}
		className={cn(
			"group relative flex shrink-0 cursor-col-resize touch-none select-none justify-center focus-visible:outline-none",
			className,
		)}
		{...handlers}
	>
		<span
			aria-hidden
			className={cn(
				"h-full w-px transition-colors group-hover:bg-accent/50 group-focus-visible:bg-accent",
				dragging ? "bg-accent" : "bg-transparent",
			)}
		/>
		<span
			aria-hidden
			className={cn(
				"absolute top-1/2 h-10 w-1 -translate-y-1/2 rounded-full transition-colors group-hover:bg-accent group-focus-visible:bg-accent",
				dragging ? "bg-accent" : "bg-line",
			)}
		/>
	</div>
);
