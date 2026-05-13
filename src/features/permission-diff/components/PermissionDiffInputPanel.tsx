import type { FC } from "react";
import { inputClasses, mutedText, panelClasses } from "../styles";

type PermissionDiffInputPanelProps = {
	group1RawJson: string;
	group2RawJson: string;
	error: string | null;
	onGroup1Change: (value: string) => void;
	onGroup2Change: (value: string) => void;
	onCompare: () => void;
	onLoadSample: () => void;
};

export const PermissionDiffInputPanel: FC<PermissionDiffInputPanelProps> = ({
	group1RawJson,
	group2RawJson,
	error,
	onGroup1Change,
	onGroup2Change,
	onCompare,
	onLoadSample,
}) => {
	return (
		<section className={`rounded-xl border p-4 ${panelClasses}`}>
			<h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Input</h3>
			<label className="mt-3 flex flex-col gap-1">
				<span className={`text-xs font-medium uppercase tracking-wide ${mutedText}`}>
					Group 1 JSON
				</span>
				<textarea
					value={group1RawJson}
					onChange={(e) => onGroup1Change(e.target.value)}
					className={`h-48 w-full resize-y rounded-md border p-3 font-mono text-xs outline-none focus:border-accent ${inputClasses}`}
					placeholder='[{"name":"Merchant Admin","permissions":[{"type":"permission","action":"GET","resource":"/api/v1/orders"}]}]'
				/>
			</label>

			<label className="mt-3 flex flex-col gap-1">
				<span className={`text-xs font-medium uppercase tracking-wide ${mutedText}`}>
					Group 2 JSON
				</span>
				<textarea
					value={group2RawJson}
					onChange={(e) => onGroup2Change(e.target.value)}
					className={`h-48 w-full resize-y rounded-md border p-3 font-mono text-xs outline-none focus:border-accent ${inputClasses}`}
					placeholder='[{"name":"Ops Admin","permissions":[{"type":"permission","action":"GET","resource":"/api/v1/orders"}]}]'
				/>
			</label>

			<div className="mt-3 flex flex-wrap gap-2">
				<button
					type="button"
					onClick={onCompare}
					className="rounded-md border border-accent bg-accent/20 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-accent/30 dark:text-slate-100"
				>
					Compare
				</button>
				<button
					type="button"
					onClick={onLoadSample}
					className="rounded-md border border-slate-400 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-slate-500/50 dark:text-slate-200 dark:hover:bg-slate-800/20"
				>
					Load sample
				</button>
			</div>

			{error ? (
				<div className="mt-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-200">
					{error}
				</div>
			) : null}
		</section>
	);
};
