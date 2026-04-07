import type { FC } from "react";
import type { EndpointItem } from "../../types/openapi";

type SwaggerEndpointListProps = {
	endpoints: EndpointItem[];
	selectedIds: Set<string>;
	onToggleSelection: (id: string) => void;
};

export const SwaggerEndpointList: FC<SwaggerEndpointListProps> = ({
	endpoints,
	selectedIds,
	onToggleSelection,
}) => (
	<div className="min-h-0 flex-1 overflow-y-auto p-2 max-h-[40vh] lg:max-h-[50vh]">
		{endpoints.length === 0 ? (
			<div className="rounded-md border border-dashed border-slate-700 p-4 text-center text-sm text-slate-400">
				No matching endpoints.
			</div>
		) : (
			<ul className="space-y-1.5">
				{endpoints.map((endpoint) => {
					const checked = selectedIds.has(endpoint.id);
					return (
						<li key={endpoint.id}>
							<button
								type="button"
								onClick={() => onToggleSelection(endpoint.id)}
								className={`w-full rounded-lg border px-3 py-2 text-left transition ${
									checked
										? "border-accent/70 bg-accent/10"
										: "border-slate-700 bg-slate-900/60 hover:border-slate-500"
								}`}
							>
								<div className="flex items-center justify-between gap-3">
									<span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-sky-300">
										{endpoint.method}
									</span>
									<input
										type="checkbox"
										checked={checked}
										onClick={(event) => event.stopPropagation()}
										onChange={() => onToggleSelection(endpoint.id)}
										className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-accent focus:ring-accent"
									/>
								</div>
								<p className="mt-1 break-all font-mono text-xs text-slate-100">
									{endpoint.path}
								</p>
								{endpoint.summary ? (
									<p className="mt-1 text-xs text-slate-400">
										{endpoint.summary}
									</p>
								) : null}
							</button>
						</li>
					);
				})}
			</ul>
		)}
	</div>
);
