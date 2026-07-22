import { SearchX } from "lucide-react";
import type { FC } from "react";
import { cn } from "@/components/ui/cn";
import { MethodBadge } from "@/components/ui/Badge";
import type { EndpointItem } from "@/types/openapi";

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
	<div className="scroll-ide min-h-0 flex-1 overflow-y-auto p-2">
		{endpoints.length === 0 ? (
			<div className="m-2 flex flex-col items-center gap-2 rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
				<SearchX className="h-5 w-5" aria-hidden />
				No matching endpoints.
			</div>
		) : (
			<ul className="space-y-1.5">
				{endpoints.map((endpoint) => {
					const checked = selectedIds.has(endpoint.id);
					return (
						<li key={endpoint.id}>
							{/* Whole row is a real <label> wrapping the checkbox — no
							    nested interactive controls. */}
							<label
								className={cn(
									"flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition",
									checked
										? "border-accent/60 bg-accent/10"
										: "border-line bg-surface hover:border-muted/40 hover:bg-raised",
								)}
							>
								<input
									type="checkbox"
									checked={checked}
									onChange={() => onToggleSelection(endpoint.id)}
									className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-accent focus:ring-accent"
								/>
								<span className="min-w-0 flex-1">
									<span className="flex items-center gap-2">
										<MethodBadge method={endpoint.method} />
										<span className="min-w-0 break-all font-mono text-xs text-fg">
											{endpoint.path}
										</span>
									</span>
									{endpoint.summary ? (
										<span className="mt-1 block text-xs text-muted">
											{endpoint.summary}
										</span>
									) : null}
								</span>
							</label>
						</li>
					);
				})}
			</ul>
		)}
	</div>
);
