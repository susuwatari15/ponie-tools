import { Search } from "lucide-react";
import { type FC, useMemo } from "react";
import type { EndpointItem, HttpMethod } from "@/types/openapi";

const HTTP_METHODS: HttpMethod[] = ["get", "post", "put", "patch", "delete", "options", "head", "trace"];

const METHOD_COLORS: Record<HttpMethod, { active: string; inactive: string }> = {
	get: { active: "bg-emerald-600 text-white", inactive: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60" },
	post: { active: "bg-blue-600 text-white", inactive: "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-900/60" },
	put: { active: "bg-amber-600 text-white", inactive: "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-900/60" },
	patch: { active: "bg-orange-600 text-white", inactive: "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:hover:bg-orange-900/60" },
	delete: { active: "bg-rose-600 text-white", inactive: "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-900/60" },
	options: { active: "bg-slate-600 text-white", inactive: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700" },
	head: { active: "bg-slate-600 text-white", inactive: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700" },
	trace: { active: "bg-slate-600 text-white", inactive: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700" },
};

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
			if (segments.length > 0) {
				prefixes.add(`/${segments[0]}`);
			}
		}
		return Array.from(prefixes).sort();
	}, [endpoints]);

	const availableMethods = useMemo(() => {
		const methods = new Set<HttpMethod>();
		for (const endpoint of endpoints) {
			methods.add(endpoint.method);
		}
		return HTTP_METHODS.filter((m) => methods.has(m));
	}, [endpoints]);

	return (
		<div className="border-b border-slate-200 p-3 dark:border-slate-700/70">
			<div className="relative">
				<Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
				<input
					value={searchQuery}
					onChange={(event) => onSearchQueryChange(event.target.value)}
					placeholder="Search path, method, summary..."
					className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-accent dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100"
				/>
			</div>

			{availableMethods.length > 1 ? (
				<div className="mt-2 flex flex-wrap gap-1.5">
					{availableMethods.map((method) => {
						const isActive = selectedMethods.includes(method);
						const colors = METHOD_COLORS[method];
						return (
							<button
								key={method}
								type="button"
								onClick={() => onToggleMethod(method)}
								className={`rounded-md px-2 py-0.5 text-xs font-medium uppercase transition ${isActive ? colors.active : colors.inactive}`}
							>
								{method}
							</button>
						);
					})}
				</div>
			) : null}

			{pathPrefixes.length > 1 ? (
				<div className="mt-2 flex flex-wrap gap-1.5">
					{pathPrefixes.map((prefix) => (
						<button
							key={prefix}
							type="button"
							onClick={() => onSearchQueryChange(prefix)}
							className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
								searchQuery === prefix
									? "bg-accent text-white"
									: "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
							}`}
						>
							{prefix}
						</button>
					))}
				</div>
			) : null}

			<div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
				<span>
					{selectedCount} selected / {totalEndpoints}
				</span>
				<button
					type="button"
					onClick={onToggleSelectAllVisible}
					disabled={!canToggleVisible}
					className="rounded px-2 py-1 text-sky-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-sky-300 dark:hover:bg-slate-800 dark:disabled:text-slate-600"
				>
					{visibleAllSelected ? "Unselect visible" : "Select visible"}
				</button>
			</div>
		</div>
	);
};
