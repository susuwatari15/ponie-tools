import { type FC, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { MinifiedOperation } from "../../../types/openapi";
import type { OpenApiCompareResult } from "../../../utils/openApiCompare";
import { TextDiffUnified } from "./TextDiffUnified";
import { parseOpenApiInput } from "../../../utils/openApiInput";
import { minifySwagger } from "../../../utils/swaggerMinifier";
import { formatSwaggerEndpointsShort } from "../../../utils/swaggerShortFormat";

function formatOp(op: MinifiedOperation | undefined): string {
	if (!op) return "—";
	return JSON.stringify(op, null, 2);
}

type SwaggerCompareResultsProps = {
	result: OpenApiCompareResult | null;
	rawJsonB?: string;
};

const buildSelectedClipboardText = (
	selectedEndpointIds: string[],
	rawJsonB: string,
	format: "full" | "short"
): string | null => {
	const parsedB = parseOpenApiInput(rawJsonB.trim());
	if (parsedB.error || !parsedB.doc) return null;

	if (format === "full") {
		return minifySwagger(selectedEndpointIds, parsedB.doc);
	}
	return formatSwaggerEndpointsShort(parsedB.doc, selectedEndpointIds);
};

export const SwaggerCompareResults: FC<SwaggerCompareResultsProps> = ({ result, rawJsonB }) => {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [prevResult, setPrevResult] = useState<OpenApiCompareResult | null>(null);
	const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

	// Sync state when result changes
	if (result !== prevResult) {
		setPrevResult(result);
		if (result && result.ok) {
			const initial = new Set<string>([
				...result.added.map((item) => item.id),
				...result.changed.map((item) => item.id),
			]);
			setSelectedIds(initial);
		} else {
			setSelectedIds(new Set());
		}
	}

	if (!result) {
		return (
			<p className="text-sm text-slate-600 dark:text-slate-500">
				Select two snapshots and click Compare to see added, removed, and changed endpoints.
			</p>
		);
	}

	if (!result.ok) {
		return (
			<div className="rounded-lg border border-amber-400 bg-amber-50 p-3 dark:border-amber-700/50 dark:bg-amber-950/30">
				<p className="text-sm text-amber-900 dark:text-amber-200">
					{result.side === "b" ? "(Version B) " : result.side === "a" ? "(Version A) " : ""}
					{result.error}
				</p>
			</div>
		);
	}

	const { labelA, labelB, added, removed, changed } = result;

	const allSelectableIds = [
		...added.map((item) => item.id),
		...changed.map((item) => item.id),
	];

	const toggleEndpoint = (id: string) => {
		const next = new Set(selectedIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		setSelectedIds(next);
	};

	const handleSelectAll = () => {
		setSelectedIds(new Set(allSelectableIds));
	};

	const handleSelectNone = () => {
		setSelectedIds(new Set());
	};

	const handleCopy = async (format: "full" | "short") => {
		if (!rawJsonB || selectedIds.size === 0) return;
		const selectedList = Array.from(selectedIds);
		const text = buildSelectedClipboardText(selectedList, rawJsonB, format);
		if (text === null) {
			setCopyStatus("failed");
			window.setTimeout(() => setCopyStatus("idle"), 2000);
			return;
		}
		try {
			await navigator.clipboard.writeText(text);
			setCopyStatus("copied");
			window.setTimeout(() => setCopyStatus("idle"), 2000);
		} catch {
			setCopyStatus("failed");
			window.setTimeout(() => setCopyStatus("idle"), 2000);
		}
	};

	const selectableCount = allSelectableIds.length;
	const selectedCount = selectedIds.size;

	return (
		<div className="space-y-6">
			{selectableCount > 0 && rawJsonB ? (
				<div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-panelSoft/50 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-wrap items-center gap-3">
						<span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
							Selected {selectedCount} of {selectableCount} endpoints
						</span>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleSelectAll}
								className="text-xs text-accent hover:underline focus:outline-none"
							>
								Select All
							</button>
							<span className="text-slate-300 dark:text-slate-700">|</span>
							<button
								type="button"
								onClick={handleSelectNone}
								className="text-xs text-accent hover:underline focus:outline-none"
							>
								Deselect All
							</button>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{copyStatus === "copied" ? (
							<span className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
								<Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" aria-hidden />
								Copied Selected!
							</span>
						) : copyStatus === "failed" ? (
							<span className="rounded-md border border-rose-400 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
								Copy failed
							</span>
						) : (
							<div className="flex items-center gap-2">
								<button
									type="button"
									disabled={selectedCount === 0}
									onClick={() => void handleCopy("full")}
									className="inline-flex items-center gap-1.5 rounded-md border border-slate-400 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-500 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-400 dark:hover:bg-slate-700"
								>
									<Copy className="size-3.5 shrink-0 opacity-80" aria-hidden />
									Copy Selected (JSON)
								</button>
								<button
									type="button"
									disabled={selectedCount === 0}
									onClick={() => void handleCopy("short")}
									className="inline-flex items-center gap-1.5 rounded-md border border-slate-400 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-500 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-400 dark:hover:bg-slate-700"
								>
									<Copy className="size-3.5 shrink-0 opacity-80" aria-hidden />
									Copy Selected (Short)
								</button>
							</div>
						)}
					</div>
				</div>
			) : null}

			{removed.length > 0 ? (
				<section>
					<h3 className="mb-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
						Only in {labelA} ({removed.length})
					</h3>
					<ul className="space-y-2">
						{removed.map((item) => (
							<li
								key={item.id}
								className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 dark:border-slate-700/80 dark:bg-slate-950/50 dark:text-slate-200"
							>
								<span className="text-emerald-700 dark:text-emerald-400/90">{item.id}</span>
								{item.summary ? (
									<span className="ml-2 text-slate-500">{item.summary}</span>
								) : null}
							</li>
						))}
					</ul>
				</section>
			) : null}

			{added.length > 0 ? (
				<section>
					<h3 className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
						Only in {labelB} ({added.length})
					</h3>
					<ul className="space-y-2">
						{added.map((item) => {
							const isChecked = selectedIds.has(item.id);
							return (
								<li
									key={item.id}
									className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 dark:border-slate-700/80 dark:bg-slate-950/50 dark:text-slate-200"
								>
									<input
										type="checkbox"
										checked={isChecked}
										onChange={() => toggleEndpoint(item.id)}
										className="h-4.5 w-4.5 rounded border-slate-300 text-accent focus:ring-accent dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
									/>
									<div className="min-w-0 flex-1">
										<span className="text-emerald-700 dark:text-emerald-400/90">{item.id}</span>
										{item.summary ? (
											<span className="ml-2 text-slate-500">{item.summary}</span>
										) : null}
									</div>
								</li>
							);
						})}
					</ul>
				</section>
			) : null}

			{changed.length > 0 ? (
				<section>
					<h3 className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
						Changed ({changed.length})
					</h3>
					<ul className="space-y-4">
						{changed.map((row) => {
							const isChecked = selectedIds.has(row.id);
							return (
								<li
									key={row.id}
									className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700/80 dark:bg-slate-950/40"
								>
									<div className="flex items-center gap-3 border-b border-slate-200 px-3 py-2 font-mono text-xs text-emerald-800 dark:border-slate-700/70 dark:text-emerald-300">
										<input
											type="checkbox"
											checked={isChecked}
											onChange={() => toggleEndpoint(row.id)}
											className="h-4.5 w-4.5 rounded border-slate-300 text-accent focus:ring-accent dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
										/>
										<span>{row.id}</span>
									</div>
									<div className="p-3">
										<TextDiffUnified
											labelA={labelA}
											labelB={labelB}
											oldText={formatOp(row.left)}
											newText={formatOp(row.right)}
										/>
									</div>
								</li>
							);
						})}
					</ul>
				</section>
			) : null}

			{added.length === 0 && removed.length === 0 && changed.length === 0 ? (
				<p className="text-sm text-slate-600 dark:text-slate-400">
					No API differences found between the two snapshots (using minified request/response
					shape).
				</p>
			) : null}
		</div>
	);
};
