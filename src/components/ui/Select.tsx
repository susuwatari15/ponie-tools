import { ChevronsUpDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "./cn";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
	/** Optional adornment shown at the left edge (e.g. a color dot). */
	adornment?: ReactNode;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
	({ className, children, adornment, ...rest }, ref) => (
		<div className="relative">
			{adornment ? (
				<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
					{adornment}
				</span>
			) : null}
			<select
				ref={ref}
				className={cn(
					"w-full appearance-none rounded-lg border border-line bg-surface py-2 pr-9 text-sm text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60",
					adornment ? "pl-9" : "pl-3",
					className,
				)}
				{...rest}
			>
				{children}
			</select>
			<ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
		</div>
	),
);
Select.displayName = "Select";
