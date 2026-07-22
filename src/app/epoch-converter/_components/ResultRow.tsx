import { Copy } from "lucide-react";
import type { FC } from "react";
import { IconButton, cn } from "@/components/ui";

type ResultRowProps = {
	label: string;
	value: string;
	onCopy: () => void;
	/** Emphasize the value (e.g. the primary result). */
	accent?: boolean;
};

/** A labelled, copyable read-only value row used across the converter cards. */
export const ResultRow: FC<ResultRowProps> = ({
	label,
	value,
	onCopy,
	accent = false,
}) => (
	<div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-raised/50 px-3 py-2">
		<div className="min-w-0">
			<p className="font-mono text-[10px] uppercase tracking-widest text-muted">
				{label}
			</p>
			<p
				className={cn(
					"truncate font-mono text-sm",
					accent ? "font-semibold text-accent" : "text-fg",
				)}
			>
				{value}
			</p>
		</div>
		<IconButton
			label={`Copy ${label}`}
			onClick={onCopy}
			className="shrink-0 border-transparent bg-transparent"
		>
			<Copy className="h-4 w-4" />
		</IconButton>
	</div>
);
