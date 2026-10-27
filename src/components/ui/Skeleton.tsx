import type { FC, ReactNode } from "react";
import { cn } from "./cn";

/** A pulsing placeholder block, sized by `className`. */
export const Skeleton: FC<{ className?: string }> = ({ className }) => (
	<div aria-hidden className={cn("animate-pulse rounded-md bg-line/70", className)} />
);

/**
 * Wraps skeleton blocks shown while persisted state hydrates, so assistive
 * tech hears one "loading" status instead of an empty → filled flash.
 */
export const SkeletonGroup: FC<{
	children: ReactNode;
	label?: string;
	className?: string;
}> = ({ children, label = "Loading saved data", className }) => (
	<div role="status" aria-busy="true" aria-label={label} className={className}>
		{children}
	</div>
);
