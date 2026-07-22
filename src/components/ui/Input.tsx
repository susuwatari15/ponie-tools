import type { InputHTMLAttributes } from "react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "./cn";

const fieldBase =
	"w-full rounded-lg border border-line bg-surface text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
	/** Icon rendered inside the field on the left. */
	icon?: ReactNode;
	mono?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ className, icon, mono, ...rest }, ref) => {
		if (icon) {
			return (
				<div className="relative">
					<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
						{icon}
					</span>
					<input
						ref={ref}
						className={cn(fieldBase, "py-2 pl-9 pr-3 text-sm", mono && "font-mono", className)}
						{...rest}
					/>
				</div>
			);
		}
		return (
			<input
				ref={ref}
				className={cn(fieldBase, "px-3 py-2 text-sm", mono && "font-mono", className)}
				{...rest}
			/>
		);
	},
);
Input.displayName = "Input";
