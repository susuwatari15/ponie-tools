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
	<section className="flex min-h-[640px] flex-col overflow-hidden rounded-xl border border-slate-700/70 bg-panel/75">
		<div className="flex items-center justify-between border-b border-slate-700/70 p-3">
			<div>
				<h2 className="text-sm font-medium text-slate-100">
					Compressed Output
				</h2>
				<p className="text-xs text-slate-400">
					Path + method + summary + TS-style request/response schemas
				</p>
			</div>

			<button
				type="button"
				onClick={onCopy}
				disabled={!minifiedOutput}
				className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
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
			<pre className="h-full overflow-auto rounded-md border border-slate-700 bg-slate-950/90 p-3 font-mono text-xs leading-6 text-slate-200">
				{hasParseError
					? "// Fix invalid JSON to generate output."
					: selectedCount === 0
						? "// Select one or more endpoints from the left pane."
						: minifiedOutput}
			</pre>
		</div>
	</section>
);
