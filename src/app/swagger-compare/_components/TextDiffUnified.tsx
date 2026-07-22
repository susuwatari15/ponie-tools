import type { FC } from "react";
import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { buildUnifiedDiffLines } from "../_lib/buildUnifiedDiffLines";
import { CharDiffStream } from "./CharDiffStream";

type TextDiffUnifiedProps = {
	labelA: string;
	labelB: string;
	oldText: string;
	newText: string;
};

type DiffMode = "lines" | "chars";

const CHAR_DIFF_MAX_COMBINED = 48_000;

export const TextDiffUnified: FC<TextDiffUnifiedProps> = ({
	labelA,
	labelB,
	oldText,
	newText,
}) => {
	const [mode, setMode] = useState<DiffMode>("chars");
	const rows = buildUnifiedDiffLines(oldText, newText);
	const combinedLen = oldText.length + newText.length;
	const showCharMode = combinedLen <= CHAR_DIFF_MAX_COMBINED;

	return (
		<div className="overflow-hidden rounded-lg border border-line bg-ink/40 dark:bg-ink/60">
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-2 py-1.5">
				<div className="flex flex-wrap items-center gap-x-2 font-mono text-[10px] text-muted">
					<span className="font-medium text-rose-600 dark:text-rose-300">− {labelA}</span>
					<span className="text-muted/60" aria-hidden>
						·
					</span>
					<span className="font-medium text-emerald-600 dark:text-emerald-300">
						+ {labelB}
					</span>
				</div>
				{showCharMode ? (
					<div
						className="flex rounded-md border border-line bg-surface p-0.5 font-mono text-[10px]"
						role="tablist"
						aria-label="Diff view mode"
					>
						{(["lines", "chars"] as DiffMode[]).map((m) => (
							<button
								key={m}
								type="button"
								role="tab"
								aria-selected={mode === m}
								onClick={() => setMode(m)}
								className={cn(
									"rounded px-2 py-0.5 font-medium capitalize transition",
									mode === m
										? "bg-raised text-fg shadow-sm"
										: "text-muted hover:text-fg",
								)}
							>
								{m}
							</button>
						))}
					</div>
				) : null}
			</div>

			{mode === "lines" || !showCharMode ? (
				<div className="scroll-ide max-h-80 overflow-auto font-mono text-[11px] leading-relaxed">
					{rows.map((row, i) => {
						const base =
							row.kind === "remove"
								? "bg-rose-500/10 text-rose-800 border-l-2 border-rose-500 dark:text-rose-100"
								: row.kind === "add"
									? "bg-emerald-500/10 text-emerald-800 border-l-2 border-emerald-500 dark:text-emerald-100"
									: "text-fg/80 border-l-2 border-transparent";
						return (
							<div
								key={`${row.prefix}-${row.kind}-${i}-${row.text.length}`}
								className={cn("flex min-h-[1.25rem]", base)}
							>
								<span
									className="w-4 shrink-0 select-none pl-1 text-right font-semibold text-muted"
									aria-hidden
								>
									{row.prefix}
								</span>
								<span className="min-w-0 flex-1 whitespace-pre pr-2">{row.text}</span>
							</div>
						);
					})}
				</div>
			) : (
				<CharDiffStream oldText={oldText} newText={newText} />
			)}
		</div>
	);
};
