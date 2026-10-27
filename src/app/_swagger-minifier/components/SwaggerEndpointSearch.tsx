import { Link2, Search, X } from "lucide-react";
import { type FC, type ReactNode, useEffect, useMemo, useRef } from "react";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/Input";
import { Kbd } from "@/components/ui/Kbd";
import { methodStyle, HTTP_METHOD_ORDER } from "@/components/ui/methodColors";
import type { EndpointGroupMode } from "@/lib/endpointFilter";
import type { EndpointItem, HttpMethod } from "@/types/openapi";

const GROUP_MODES: { value: EndpointGroupMode; label: string }[] = [
	{ value: "tag", label: "Tag" },
	{ value: "path", label: "Path" },
	{ value: "none", label: "None" },
];

type SwaggerEndpointSearchProps = {
	groupMode: EndpointGroupMode;
	onGroupModeChange: (mode: EndpointGroupMode) => void;
	/** Rendered at the end of the selection row (the presets menu). */
	selectionActions?: ReactNode;
	sharedSelectionPending: number;
	onDismissSharedSelection: () => void;
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
	groupMode,
	onGroupModeChange,
	selectionActions,
	sharedSelectionPending,
	onDismissSharedSelection,
}) => {
	const searchRef = useRef<HTMLInputElement>(null);

	// Cmd/Ctrl+Shift+F focuses the search from anywhere on the page.
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "f") {
				event.preventDefault();
				searchRef.current?.focus();
				searchRef.current?.select();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

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
			{sharedSelectionPending > 0 ? (
				<div className="flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-2 py-1.5 text-xs text-fg">
					<Link2 className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
					<span className="min-w-0 flex-1">
						Shared link: {sharedSelectionPending} endpoint
						{sharedSelectionPending === 1 ? "" : "s"} will be selected once their spec is
						loaded.
					</span>
					<button
						type="button"
						onClick={onDismissSharedSelection}
						aria-label="Dismiss shared selection"
						className="rounded p-0.5 text-muted transition hover:text-fg pointer-coarse:p-2"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				</div>
			) : null}

			<div className="relative">
				<Input
					ref={searchRef}
					value={searchQuery}
					onChange={(event) => onSearchQueryChange(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Escape" && searchQuery) {
							event.preventDefault();
							onSearchQueryChange("");
						}
					}}
					placeholder="Search path, method, summary, tag…"
					icon={<Search className="h-4 w-4" />}
					aria-label="Search endpoints"
					aria-keyshortcuts="Control+Shift+F Meta+Shift+F"
					className="!pr-24"
				/>
				<Kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
					⌘/Ctrl ⇧F
				</Kbd>
			</div>

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
									"rounded-md px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide transition pointer-coarse:min-h-10",
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
									"rounded-md px-2 py-0.5 font-mono text-xs transition pointer-coarse:min-h-10",
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

			<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
				<div className="inline-flex items-center gap-1.5">
					<span id="endpoint-group-label">Group</span>
					<div
						className="inline-flex rounded-md border border-line bg-raised/60 p-0.5"
						role="radiogroup"
						aria-labelledby="endpoint-group-label"
					>
						{GROUP_MODES.map(({ value, label }) => {
							const active = groupMode === value;
							return (
								<button
									key={value}
									type="button"
									role="radio"
									aria-checked={active}
									onClick={() => onGroupModeChange(value)}
									className={cn(
										"rounded px-2 py-0.5 text-[11px] font-medium transition pointer-coarse:min-h-10",
										active ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
									)}
								>
									{label}
								</button>
							);
						})}
					</div>
				</div>
				{selectionActions}
			</div>

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
