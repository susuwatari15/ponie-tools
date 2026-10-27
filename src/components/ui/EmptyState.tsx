import type { LucideIcon } from "lucide-react";
import type { FC, ReactNode } from "react";
import { cn } from "./cn";
import { Spinner } from "./Spinner";

export type EmptyStateProps = {
	icon?: LucideIcon;
	title: string;
	description?: ReactNode;
	action?: ReactNode;
	className?: string;
	tone?: "default" | "error";
	/** Shows a `Spinner` in the icon slot while work is in flight. */
	loading?: boolean;
};

export const EmptyState: FC<EmptyStateProps> = ({
	icon: Icon,
	title,
	description,
	action,
	className,
	tone = "default",
	loading = false,
}) => (
	<div
		aria-busy={loading || undefined}
		className={cn(
			"flex flex-col items-center justify-center rounded-card border border-dashed px-6 py-10 text-center",
			tone === "error" ? "border-del/40 bg-del/5" : "border-line bg-raised/40",
			className,
		)}
	>
		{loading ? (
			<span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface">
				<Spinner className="h-5 w-5" label={title} />
			</span>
		) : Icon ? (
			<span
				className={cn(
					"mb-3 flex h-11 w-11 items-center justify-center rounded-xl border",
					tone === "error"
						? "border-del/30 bg-del/10 text-del"
						: "border-line bg-surface text-muted",
				)}
			>
				<Icon className="h-5 w-5" aria-hidden />
			</span>
		) : null}
		<p className="text-sm font-medium text-fg">{title}</p>
		{description ? (
			<p className="mt-1 max-w-sm text-xs text-muted">{description}</p>
		) : null}
		{action ? <div className="mt-4">{action}</div> : null}
	</div>
);
