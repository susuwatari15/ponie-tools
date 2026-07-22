import { Loader2 } from "lucide-react";
import type { FC } from "react";
import { cn } from "./cn";

export const Spinner: FC<{ className?: string; label?: string }> = ({
	className,
	label = "Loading",
}) => (
	<Loader2
		className={cn("h-4 w-4 animate-spin text-muted", className)}
		aria-label={label}
	/>
);
