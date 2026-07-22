import type { ButtonHTMLAttributes, FC, ReactNode } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const base =
	"inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
	primary:
		"bg-accent text-white shadow-sm hover:bg-accent/90 active:bg-accent/80",
	secondary:
		"border border-line bg-surface text-fg hover:border-muted/50 hover:bg-raised",
	ghost: "text-muted hover:bg-raised hover:text-fg",
	danger:
		"border border-del/40 bg-del/10 text-del hover:border-del/70 hover:bg-del/15",
};

const sizes: Record<ButtonSize, string> = {
	sm: "px-2.5 py-1.5 text-xs",
	md: "px-3.5 py-2 text-sm",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
};

export const Button: FC<ButtonProps> = ({
	variant = "secondary",
	size = "md",
	leftIcon,
	rightIcon,
	className,
	children,
	type = "button",
	...rest
}) => (
	<button
		type={type}
		className={cn(base, variants[variant], sizes[size], className)}
		{...rest}
	>
		{leftIcon}
		{children}
		{rightIcon}
	</button>
);
