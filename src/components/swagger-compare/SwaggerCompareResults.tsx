import type { FC } from "react";
import type { MinifiedOperation } from "../../types/openapi";
import type { OpenApiCompareResult } from "../../utils/openApiCompare";
import { TextDiffUnified } from "./TextDiffUnified";

function formatOp(op: MinifiedOperation | undefined): string {
	if (!op) return "—";
	return JSON.stringify(op, null, 2);
}

type SwaggerCompareResultsProps = {
	result: OpenApiCompareResult | null;
};

export const SwaggerCompareResults: FC<SwaggerCompareResultsProps> = ({ result }) => {
	if (!result) {
		return (
			<p className="text-sm text-slate-500">
				Select two snapshots and click Compare to see added, removed, and changed endpoints.
			</p>
		);
	}

	if (!result.ok) {
		return (
			<div className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-3">
				<p className="text-sm text-amber-200">
					{result.side === "b" ? "(Version B) " : result.side === "a" ? "(Version A) " : ""}
					{result.error}
				</p>
			</div>
		);
	}

	const { labelA, labelB, added, removed, changed } = result;

	return (
		<div className="space-y-6">
			{removed.length > 0 ? (
				<section>
					<h3 className="mb-2 text-sm font-semibold text-rose-300">
						Only in {labelA} ({removed.length})
					</h3>
					<ul className="space-y-2">
						{removed.map((item) => (
							<li
								key={item.id}
								className="rounded-md border border-slate-700/80 bg-slate-950/50 px-3 py-2 font-mono text-xs text-slate-200"
							>
								<span className="text-emerald-400/90">{item.id}</span>
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
					<h3 className="mb-2 text-sm font-semibold text-emerald-300">
						Only in {labelB} ({added.length})
					</h3>
					<ul className="space-y-2">
						{added.map((item) => (
							<li
								key={item.id}
								className="rounded-md border border-slate-700/80 bg-slate-950/50 px-3 py-2 font-mono text-xs text-slate-200"
							>
								<span className="text-emerald-400/90">{item.id}</span>
								{item.summary ? (
									<span className="ml-2 text-slate-500">{item.summary}</span>
								) : null}
							</li>
						))}
					</ul>
				</section>
			) : null}

			{changed.length > 0 ? (
				<section>
					<h3 className="mb-2 text-sm font-semibold text-amber-200">
						Changed ({changed.length})
					</h3>
					<ul className="space-y-4">
						{changed.map((row) => (
							<li
								key={row.id}
								className="overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950/40"
							>
								<div className="border-b border-slate-700/70 px-3 py-2 font-mono text-xs text-emerald-300">
									{row.id}
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
						))}
					</ul>
				</section>
			) : null}

			{added.length === 0 && removed.length === 0 && changed.length === 0 ? (
				<p className="text-sm text-slate-400">
					No API differences found between the two snapshots (using minified request/response
					shape).
				</p>
			) : null}
		</div>
	);
};
