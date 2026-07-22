import type { FC, ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export type PageHeaderProps = {
	title: string;
	description?: string;
	/** Small mono eyebrow above the title, e.g. `// swagger · minify`. */
	eyebrow?: string;
	/** Controls to the right of the title block. */
	actions?: ReactNode;
	className?: string;
	titleAs?: "h1" | "h2";
};

export const PageHeader: FC<PageHeaderProps> = ({
	title,
	description,
	eyebrow,
	actions,
	className,
	titleAs = "h1",
}) => {
	const Heading = titleAs;
	return (
		<div
			className={cn(
				"flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4",
				className,
			)}
		>
			<div className="min-w-0">
				{eyebrow ? (
					<p className="font-mono text-[11px] uppercase tracking-widest text-muted">
						{eyebrow}
					</p>
				) : null}
				<Heading className="text-xl font-semibold tracking-tight text-fg">
					{title}
				</Heading>
				{description ? (
					<p className="mt-1 text-sm text-muted">{description}</p>
				) : null}
			</div>
			{actions ? (
				<div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
			) : null}
		</div>
	);
};
