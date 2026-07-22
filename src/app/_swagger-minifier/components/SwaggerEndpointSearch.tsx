import { Search } from "lucide-react";
import { type FC, useMemo } from "react";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/Input";
import { methodStyle, HTTP_METHOD_ORDER } from "@/components/ui/methodColors";
import type { EndpointItem, HttpMethod } from "@/types/openapi";

type SwaggerEndpointSearchProps = {
	searchQuery: string;
	onSearchQueryChange: (value: string) => void;
	selectedMethods: HttpMethod[];
	onToggleMethod: (method: HttpMethod) => void;
	selectedCount: number;
	totalEndpoints: number;
	visibleAllSelected: boolean;
	onToggleSelectAllVisible: () => void;
	canToggleVisible: boolean;
	endpoints: EndpointItem[];
};

export const SwaggerEndpointSearch: FC<SwaggerEndpointSearchProps> = ({
	searchQuery,
	onSearchQueryChange,
	selectedMethods,
	onToggleMethod,
	selectedCount,
	totalEndpoints,
	visibleAllSelected,
	onToggleSelectAllVisible,
	canToggleVisible,
	endpoints,
}) => {
	const pathPrefixes = useMemo(() => {
		const prefixes = new Set<string>();
		for (const endpoint of endpoints) {
			const segments = endpoint.path.split("/").filter(Boolean);
			if (segments.length > 0) prefixes.add(`/${segments[0]}`);
		}
		return Array.from(prefixes).sort();
	}, [endpoints]);

	const availableMethods = useMemo(() => {
		const methods = new Set<HttpMethod>();
		for (const endpoint of endpoints) methods.add(endpoint.method);
		return HTTP_METHOD_ORDER.filter((m) => methods.has(m));
	}, [endpoints]);

	return (
		<div className="space-y-2.5 border-b border-line p-3">
			<Input
				value={searchQuery}
				onChange={(event) => onSearchQueryChange(event.target.value)}
				placeholder="Search path, method, summary…"
				icon={<Search className="h-4 w-4" />}
				aria-label="Search endpoints"
			/>

			{availableMethods.length > 1 ? (
				<div className="flex flex-wrap gap-1.5">
					{availableMethods.map((method) => {
						const isActive = selectedMethods.includes(method);
						const style = methodStyle(method);
						return (
							<button
								key={method}
								type="button"
								onClick={() => onToggleMethod(method)}
								aria-pressed={isActive}
								className={cn(
									"rounded-md px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide transition",
									isActive ? style.solid : style.chip,
								)}
							>
								{method}
							</button>
						);
					})}
				</div>
			) : null}

			{pathPrefixes.length > 1 ? (
				<div className="flex flex-wrap gap-1.5">
					{pathPrefixes.map((prefix) => {
						const isActive = searchQuery === prefix;
						return (
							<button
								key={prefix}
								type="button"
								onClick={() => onSearchQueryChange(isActive ? "" : prefix)}
								className={cn(
									"rounded-md px-2 py-0.5 font-mono text-xs transition",
									isActive
										? "bg-accent text-white"
										: "bg-raised text-muted hover:text-fg",
								)}
							>
								{prefix}
							</button>
						);
					})}
				</div>
			) : null}

			<div className="flex items-center justify-between text-xs text-muted">
				<span>
					<span className="font-mono text-fg">{selectedCount}</span> selected /{" "}
					{totalEndpoints}
				</span>
				<button
					type="button"
					onClick={onToggleSelectAllVisible}
					disabled={!canToggleVisible}
					className="rounded px-2 py-1 font-medium text-accent transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:text-muted/50"
				>
					{visibleAllSelected ? "Unselect visible" : "Select visible"}
				</button>
			</div>
		</div>
	);
};
