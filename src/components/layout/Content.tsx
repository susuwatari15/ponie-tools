import type { FC, ReactNode } from "react";
import { cn } from "@/components/ui/cn";

type ContentProps = {
	children: ReactNode;
	className?: string;
};

export const Content: FC<ContentProps> = ({ children, className }) => {
	return (
		<div className={cn("scroll-ide min-h-0 min-w-0 flex-1 overflow-y-auto", className)}>
			{children}
		</div>
	);
};
