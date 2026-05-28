"use client";

import { Moon, Sun } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useTheme } from "./ThemeProvider";

const defaultWrapperClass =
	"rounded-xl border border-slate-300 bg-white/95 px-4 py-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/80 dark:shadow-none";

export type PageHeaderProps = {
	title: string;
	description?: string;
	/** Extra controls to the right of the theme toggle. */
	actions?: ReactNode;
	/** Appended to the outer wrapper (e.g. margins). */
	className?: string;
	/** Full outer wrapper classes; overrides default shell when set. */
	wrapperClassName?: string;
	titleAs?: "h1" | "h2";
	titleClassName?: string;
	descriptionClassName?: string;
};

export const PageHeader: FC<PageHeaderProps> = ({
	title,
	description,
	actions,
	className = "",
	wrapperClassName,
	titleAs = "h2",
	titleClassName = "text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100",
	descriptionClassName = "mt-1 text-sm text-slate-600 dark:text-slate-400",
}) => {
	const { resolvedTheme, toggleTheme } = useTheme();
	const Heading = titleAs;
	const outer = `${wrapperClassName ?? defaultWrapperClass} ${className}`.trim();

	return (
		<div className={outer}>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="min-w-0">
					<Heading className={titleClassName}>{title}</Heading>
					{description ? (
						<p className={descriptionClassName}>{description}</p>
					) : null}
				</div>
				<div className="flex shrink-0 flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={toggleTheme}
						className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-500/50 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:bg-slate-800/40"
						aria-label={
							resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"
						}
					>
						{resolvedTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
						<span className="hidden sm:inline">
							{resolvedTheme === "dark" ? "Light" : "Dark"}
						</span>
					</button>
					{actions}
				</div>
			</div>
		</div>
	);
};
