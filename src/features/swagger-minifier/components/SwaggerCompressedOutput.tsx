import { Check, Copy } from "lucide-react";
import type { FC } from "react";

type SwaggerCompressedOutputProps = {
	hasParseError: boolean;
	selectedCount: number;
	minifiedOutput: string;
	copied: boolean;
	onCopy: () => void;
};

export const SwaggerCompressedOutput: FC<SwaggerCompressedOutputProps> = ({
	hasParseError,
	selectedCount,
	minifiedOutput,
	copied,
	onCopy,
}) => (
	<section className="flex min-h-[640px] flex-col overflow-hidden rounded-xl border border-slate-300 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-panel/75 dark:shadow-none">
		<div className="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-700/70">
			<div>
				<h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">
					Compressed Output
				</h2>
				<p className="text-xs text-slate-600 dark:text-slate-400">
					Path + method + summary + TS-style request/response schemas
				</p>
			</div>

			<button
				type="button"
				onClick={onCopy}
				disabled={!minifiedOutput}
				className="inline-flex items-center gap-2 rounded-md border border-slate-400 bg-slate-100 px-3 py-1.5 text-xs text-slate-800 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-400"
			>
				{copied ? (
					<Check className="h-4 w-4 text-emerald-300" />
				) : (
					<Copy className="h-4 w-4" />
				)}
				{copied ? "Copied!" : "Copy"}
			</button>
		</div>

		<div className="h-[40vh] min-h-[300px] p-3 lg:h-[70vh]">
			<pre className="h-full overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-6 text-slate-800 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-200">
				{hasParseError
					? "// Fix invalid JSON to generate output."
					: selectedCount === 0
						? "// Select one or more endpoints from the left pane."
						: minifiedOutput}
			</pre>
		</div>
	</section>
);
