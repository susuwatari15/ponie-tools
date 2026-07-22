import type { FC, ReactNode } from "react";
import { cn } from "./cn";

/** A horizontal bar for filters/actions, wrapping gracefully. */
export const Toolbar: FC<{ children: ReactNode; className?: string }> = ({
	children,
	className,
}) => (
	<div
		className={cn(
			"flex flex-wrap items-center gap-2 rounded-lg border border-line bg-raised/50 px-3 py-2",
			className,
		)}
	>
		{children}
	</div>
);

/** A small mono uppercase label used before a group of controls. */
export const ToolbarLabel: FC<{ children: ReactNode; className?: string }> = ({
	children,
	className,
}) => (
	<span
		className={cn(
			"font-mono text-[10px] font-medium uppercase tracking-widest text-muted",
			className,
		)}
	>
		{children}
	</span>
);
