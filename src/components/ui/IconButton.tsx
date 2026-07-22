import type { ButtonHTMLAttributes, FC, ReactNode } from "react";
import { cn } from "./cn";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	/** Accessible label — required since the button has no visible text. */
	label: string;
	children: ReactNode;
	tone?: "default" | "danger";
};

const tones = {
	default:
		"border-line bg-surface text-muted hover:border-muted/50 hover:text-fg",
	danger:
		"border-line bg-surface text-muted hover:border-del/60 hover:text-del",
};

export const IconButton: FC<IconButtonProps> = ({
	label,
	tone = "default",
	className,
	children,
	type = "button",
	...rest
}) => (
	<button
		type={type}
		aria-label={label}
		title={label}
		className={cn(
			"inline-flex h-8 w-8 items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-45",
			tones[tone],
			className,
		)}
		{...rest}
	>
		{children}
	</button>
);
