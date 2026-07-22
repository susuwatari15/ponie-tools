import type { FC, ReactNode } from "react";
import { cn } from "./cn";
import { methodStyle } from "./methodColors";

export type BadgeTone =
	| "neutral"
	| "accent"
	| "get"
	| "post"
	| "put"
	| "patch"
	| "del";

const tones: Record<BadgeTone, string> = {
	neutral: "border-line bg-raised text-muted",
	accent: "border-accent/30 bg-accent/10 text-accent",
	get: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
	post: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
	put: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
	patch: "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300",
	del: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export type BadgeProps = {
	children: ReactNode;
	tone?: BadgeTone;
	className?: string;
	mono?: boolean;
};

export const Badge: FC<BadgeProps> = ({
	children,
	tone = "neutral",
	mono = false,
	className,
}) => (
	<span
		className={cn(
			"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
			mono && "font-mono uppercase tracking-wide",
			tones[tone],
			className,
		)}
	>
		{children}
	</span>
);

/** HTTP-method pill using the centralized method spectrum. */
export const MethodBadge: FC<{ method: string; className?: string }> = ({
	method,
	className,
}) => (
	<span
		className={cn(
			"inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide",
			methodStyle(method).chip,
			className,
		)}
	>
		{method}
	</span>
);
