import type { FC, ReactNode } from "react";
import { cn } from "./cn";

export type CardProps = {
	children: ReactNode;
	className?: string;
	/** Removes default padding — use when composing a header/body yourself. */
	flush?: boolean;
	as?: "div" | "section" | "article";
};

export const Card: FC<CardProps> = ({
	children,
	className,
	flush = false,
	as: Tag = "section",
}) => (
	<Tag
		className={cn(
			"rounded-card border border-line bg-surface shadow-card",
			!flush && "p-4",
			className,
		)}
	>
		{children}
	</Tag>
);

export type CardHeaderProps = {
	title: ReactNode;
	/** Small mono eyebrow above the title, e.g. `// input`. */
	eyebrow?: string;
	description?: ReactNode;
	actions?: ReactNode;
	className?: string;
};

export const CardHeader: FC<CardHeaderProps> = ({
	title,
	eyebrow,
	description,
	actions,
	className,
}) => (
	<div
		className={cn(
			"flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3",
			className,
		)}
	>
		<div className="min-w-0">
			{eyebrow ? (
				<p className="font-mono text-[10px] uppercase tracking-widest text-muted">
					{eyebrow}
				</p>
			) : null}
			<h3 className="truncate text-sm font-semibold text-fg">{title}</h3>
			{description ? (
				<p className="mt-0.5 text-xs text-muted">{description}</p>
			) : null}
		</div>
		{actions ? (
			<div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>
		) : null}
	</div>
);
