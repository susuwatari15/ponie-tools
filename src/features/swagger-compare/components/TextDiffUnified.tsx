import type { FC } from "react";
import { useState } from "react";
import { buildUnifiedDiffLines } from "../utils/buildUnifiedDiffLines";
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
	const [mode, setMode] = useState<DiffMode>("lines");
	const rows = buildUnifiedDiffLines(oldText, newText);
	const combinedLen = oldText.length + newText.length;
	const showCharMode = combinedLen <= CHAR_DIFF_MAX_COMBINED;

	return (
		<div className="overflow-auto rounded-md border border-slate-200 bg-white dark:border-slate-700/80 dark:bg-slate-950/90">
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-2 py-1.5 dark:border-slate-700/70">
				<div className="flex flex-wrap items-center gap-x-2 font-sans text-[10px] text-slate-600 dark:text-slate-500">
					<span className="font-medium text-rose-600 dark:text-rose-300/90">− {labelA}</span>
					<span className="text-slate-400 dark:text-slate-600" aria-hidden>
						·
					</span>
					<span className="font-medium text-emerald-600 dark:text-emerald-300/90">+ {labelB}</span>
				</div>
				{showCharMode ? (
					<div
						className="flex rounded-md border border-slate-300 bg-slate-100 p-0.5 font-sans text-[10px] dark:border-slate-600/80 dark:bg-slate-900/80"
						role="tablist"
						aria-label="Diff view mode"
					>
						<button
							type="button"
							role="tab"
							aria-selected={mode === "lines"}
							onClick={() => setMode("lines")}
							className={`rounded px-2 py-0.5 font-medium transition ${
								mode === "lines"
									? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
									: "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
							}`}
						>
							Lines
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={mode === "chars"}
							onClick={() => setMode("chars")}
							className={`rounded px-2 py-0.5 font-medium transition ${
								mode === "chars"
									? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
									: "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
							}`}
						>
							Chars
						</button>
					</div>
				) : null}
			</div>

			{mode === "lines" || !showCharMode ? (
				<div className="max-h-80 overflow-auto font-mono text-[11px] leading-relaxed">
					{rows.map((row, i) => {
						const base =
							row.kind === "remove"
								? "bg-rose-50 text-rose-900 border-l-2 border-rose-400 dark:bg-rose-950/55 dark:text-rose-100 dark:border-rose-500/80"
								: row.kind === "add"
									? "bg-emerald-50 text-emerald-900 border-l-2 border-emerald-400 dark:bg-emerald-950/45 dark:text-emerald-100 dark:border-emerald-500/80"
									: "bg-slate-50 text-slate-800 border-l-2 border-transparent dark:bg-slate-900/40 dark:text-slate-300";

						return (
							<div
								key={`${row.prefix}-${row.kind}-${i}-${row.text.length}`}
								className={`flex min-h-[1.25rem] ${base}`}
							>
								<span
									className="w-4 shrink-0 select-none pl-1 text-right font-semibold text-slate-400 dark:text-slate-500"
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
