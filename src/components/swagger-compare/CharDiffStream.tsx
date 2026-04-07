import { diffChars } from "diff";
import type { FC } from "react";

type CharDiffStreamProps = {
	oldText: string;
	newText: string;
};

/**
 * Single-stream character diff: unchanged text, deletions (rose), additions (emerald).
 */
export const CharDiffStream: FC<CharDiffStreamProps> = ({ oldText, newText }) => {
	const parts = diffChars(oldText, newText);

	return (
		<div className="max-h-80 overflow-auto p-2 font-mono text-[11px] leading-relaxed">
			<pre className="whitespace-pre-wrap break-words">
				{parts.map((part, i) => {
					const spanKey = `p-${i}-${part.added ? "a" : ""}${part.removed ? "r" : ""}-${part.value.length}`;
					if (part.added) {
						return (
							<span
								key={spanKey}
								className="rounded-sm bg-emerald-600/30 text-emerald-100 ring-1 ring-emerald-500/40"
							>
								{part.value}
							</span>
						);
					}
					if (part.removed) {
						return (
							<span
								key={spanKey}
								className="rounded-sm bg-rose-600/30 text-rose-100 line-through decoration-rose-400/70 ring-1 ring-rose-500/35"
							>
								{part.value}
							</span>
						);
					}
					return (
						<span key={spanKey} className="text-slate-300">
							{part.value}
						</span>
					);
				})}
			</pre>
		</div>
	);
};
