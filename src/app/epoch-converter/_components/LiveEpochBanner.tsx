import { Copy } from "lucide-react";
import type { FC } from "react";
import { Card, IconButton } from "@/components/ui";
import type { UseEpochConverter } from "../_hooks/useEpochConverter";

export const LiveEpochBanner: FC<{ m: UseEpochConverter }> = ({ m }) => {
	const display = m.nowSeconds === null ? "—" : String(m.nowSeconds);
	return (
		<Card className="flex flex-wrap items-center justify-between gap-3">
			<div className="min-w-0">
				<p className="font-mono text-[10px] uppercase tracking-widest text-muted">
					// current unix epoch
				</p>
				<p className="mt-1 font-mono text-3xl font-semibold tabular-nums tracking-tight text-accent">
					{display}
				</p>
				<p className="mt-1 text-xs text-muted">
					Live, in seconds — updates every second.
				</p>
			</div>
			<IconButton
				label="Copy current epoch"
				onClick={() =>
					m.nowSeconds !== null &&
					m.copy(String(m.nowSeconds), "Copied current epoch")
				}
				disabled={m.nowSeconds === null}
			>
				<Copy className="h-4 w-4" />
			</IconButton>
		</Card>
	);
};
