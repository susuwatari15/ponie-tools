import { Loader2 } from "lucide-react";
import type { FC } from "react";
import { cn } from "./cn";

/** The one in-flight indicator — use it for fetches, compares and other async work. */
export const Spinner: FC<{ className?: string; label?: string }> = ({
	className,
	label = "Loading",
}) => (
	<Loader2
		role="status"
		className={cn("h-4 w-4 shrink-0 animate-spin text-muted", className)}
		aria-label={label}
	/>
);
