import type { FC, ReactNode } from "react";
import { cn } from "./cn";

export const Kbd: FC<{ children: ReactNode; className?: string }> = ({
	children,
	className,
}) => (
	<kbd
		className={cn(
			"inline-flex min-w-[1.4rem] items-center justify-center rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted",
			className,
		)}
	>
		{children}
	</kbd>
);
