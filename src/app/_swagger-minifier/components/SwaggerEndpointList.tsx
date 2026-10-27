import { AlertTriangle, SearchX } from "lucide-react";
import { type FC, type KeyboardEvent, useRef, useState } from "react";
import { useDensity } from "@/components/layout/PreferencesProvider";
import { cn } from "@/components/ui/cn";
import { MethodBadge } from "@/components/ui/Badge";
import { Kbd } from "@/components/ui/Kbd";
import type { EndpointGroup, EndpointGroupMode } from "@/lib/endpointFilter";
import type { OpenApiDiagnostic } from "@/lib/openApiDiagnostics";
import type { EndpointItem } from "@/types/openapi";
import { SwaggerEndpointGroup } from "./SwaggerEndpointGroup";

type SwaggerEndpointListProps = {
	groups: EndpointGroup[];
	groupMode: EndpointGroupMode;
	collapsedGroups: Set<string>;
	onToggleGroupCollapsed: (key: string) => void;
	onSetGroupCollapsed: (key: string, collapsed: boolean) => void;
	selectedIds: Set<string>;
	onToggleSelection: (id: string) => void;
	onSetSelected: (ids: string[], selected: boolean) => void;
	onClearSearch: () => void;
	diagnosticsByEndpoint?: Map<string, OpenApiDiagnostic[]>;
};

const groupNavKey = (key: string) => `group:${key}`;
const endpointNavKey = (id: string) => `endpoint:${id}`;

const HINTS: { keys: string; label: string }[] = [
	{ keys: "↑↓", label: "move" },
	{ keys: "Space", label: "toggle" },
	{ keys: "⇧↑↓", label: "extend" },
	{ keys: "⌘/Ctrl A", label: "all" },
	{ keys: "←→", label: "fold" },
];

type EndpointRowProps = {
	endpoint: EndpointItem;
	compact: boolean;
	checked: boolean;
	issues?: OpenApiDiagnostic[];
	tabIndex: number;
	onToggle: () => void;
	onFocusNav: () => void;
};

const EndpointRow: FC<EndpointRowProps> = ({
	endpoint,
	compact,
	checked,
	issues,
	tabIndex,
	onToggle,
	onFocusNav,
}) => {
	const hasError = issues?.some((i) => i.severity === "error");
	return (
		<li>
			{/* Whole row is a real <label> wrapping the checkbox — no
			    nested interactive controls. */}
			<label
				className={cn(
					"flex cursor-pointer items-start rounded-lg border transition focus-within:ring-2 focus-within:ring-accent/50",
					compact ? "gap-2 px-2.5 py-1" : "gap-3 px-3 py-2",
					checked
						? "border-accent/60 bg-accent/10"
						: "border-line bg-surface hover:border-muted/40 hover:bg-raised",
				)}
			>
				<input
					type="checkbox"
					checked={checked}
					onChange={onToggle}
					data-nav-key={endpointNavKey(endpoint.id)}
					data-endpoint-id={endpoint.id}
					tabIndex={tabIndex}
					onFocus={onFocusNav}
					className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-accent focus:outline-none focus:ring-0"
				/>
				<span className="min-w-0 flex-1">
					<span className="flex items-center gap-2">
						<MethodBadge method={endpoint.method} />
						<span className="min-w-0 break-all font-mono text-xs text-fg">
							{endpoint.path}
						</span>
						{issues && issues.length > 0 ? (
							<span
								title={issues.map((issue) => issue.title).join("\n")}
								aria-label={`${issues.length} spec issue${issues.length > 1 ? "s" : ""}`}
							>
								<AlertTriangle
									className={cn(
										"h-3.5 w-3.5 shrink-0",
										hasError ? "text-del" : "text-put",
									)}
								/>
							</span>
						) : null}
					</span>
					{endpoint.summary ? (
						<span className={cn("block text-muted", compact ? "text-[11px]" : "mt-1 text-xs")}>
							{endpoint.summary}
						</span>
					) : null}
				</span>
			</label>
		</li>
	);
};

/**
 * Endpoint checklist with a single tab stop (roving tabindex): arrows move
 * between group headers and rows in visual order, so the DOM order of
 * `[data-nav-key]` elements is the navigation order.
 */
export const SwaggerEndpointList: FC<SwaggerEndpointListProps> = ({
	groups,
	groupMode,
	collapsedGroups,
	onToggleGroupCollapsed,
	onSetGroupCollapsed,
	selectedIds,
	onToggleSelection,
	onSetSelected,
	onClearSearch,
	diagnosticsByEndpoint,
}) => {
	const listRef = useRef<HTMLDivElement>(null);
	const compact = useDensity() === "compact";
	const listSpacing = compact ? "space-y-1" : "space-y-1.5";
	const [activeKey, setActiveKey] = useState<string | null>(null);

	const showHeaders = groupMode !== "none";
	const visibleEndpoints = groups.flatMap((group) => group.endpoints);

	// Rendered nav keys in order; the active one falls back to the first when
	// filtering or collapsing removed it.
	const navKeys: string[] = [];
	for (const group of groups) {
		if (showHeaders) navKeys.push(groupNavKey(group.key));
		if (!showHeaders || !collapsedGroups.has(group.key)) {
			for (const endpoint of group.endpoints) navKeys.push(endpointNavKey(endpoint.id));
		}
	}
	const tabStop = activeKey && navKeys.includes(activeKey) ? activeKey : navKeys[0];
	const tabIndexFor = (key: string) => (key === tabStop ? 0 : -1);

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const mod = event.metaKey || event.ctrlKey;

		if (mod && event.key.toLowerCase() === "a") {
			event.preventDefault();
			onSetSelected(
				visibleEndpoints.map((endpoint) => endpoint.id),
				true,
			);
			return;
		}
		if (event.key === "Escape") {
			onClearSearch();
			return;
		}

		const isMove = ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key);
		if (!isMove || !listRef.current) return;

		const items = Array.from(
			listRef.current.querySelectorAll<HTMLElement>("[data-nav-key]"),
		);
		const current = items.indexOf(document.activeElement as HTMLElement);
		if (current === -1) return;
		event.preventDefault();

		const targetIndex =
			event.key === "Home"
				? 0
				: event.key === "End"
					? items.length - 1
					: Math.min(
						items.length - 1,
						Math.max(0, current + (event.key === "ArrowDown" ? 1 : -1)),
					);
		const target = items[targetIndex];
		if (!target) return;
		target.focus();

		// Shift+arrow extends the selection over the rows it passes.
		if (event.shiftKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
			const ids = [items[current], target]
				.map((item) => item.dataset.endpointId)
				.filter((id): id is string => Boolean(id));
			if (ids.length > 0) onSetSelected(ids, true);
		}
	};

	const renderRow = (endpoint: EndpointItem) => {
		const key = endpointNavKey(endpoint.id);
		return (
			<EndpointRow
				key={endpoint.id}
				endpoint={endpoint}
				compact={compact}
				checked={selectedIds.has(endpoint.id)}
				issues={diagnosticsByEndpoint?.get(endpoint.id)}
				tabIndex={tabIndexFor(key)}
				onToggle={() => onToggleSelection(endpoint.id)}
				onFocusNav={() => setActiveKey(key)}
			/>
		);
	};

	return (
		<div ref={listRef} className="group/list scroll-ide min-h-0 p-2" onKeyDown={onKeyDown}>
			{visibleEndpoints.length === 0 ? (
				<div className="m-2 flex flex-col items-center gap-2 rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
					<SearchX className="h-5 w-5" aria-hidden />
					No matching endpoints.
				</div>
			) : showHeaders ? (
				<ul className={listSpacing} aria-label="Endpoints">
					{groups.map((group) => {
						const key = groupNavKey(group.key);
						const selectedInGroup = group.endpoints.filter((endpoint) =>
							selectedIds.has(endpoint.id),
						).length;
						return (
							<SwaggerEndpointGroup
								key={group.key}
								group={group}
								selectedCount={selectedInGroup}
								collapsed={collapsedGroups.has(group.key)}
								onToggleCollapsed={() => onToggleGroupCollapsed(group.key)}
								onSetCollapsed={(collapsed) => onSetGroupCollapsed(group.key, collapsed)}
								onSetSelected={(selected) =>
									onSetSelected(
										group.endpoints.map((endpoint) => endpoint.id),
										selected,
									)
								}
								compact={compact}
								navKey={key}
								tabIndex={tabIndexFor(key)}
								onFocusNav={() => setActiveKey(key)}
							>
								{group.endpoints.map(renderRow)}
							</SwaggerEndpointGroup>
						);
					})}
				</ul>
			) : (
				<ul className={listSpacing} aria-label="Endpoints">
					{visibleEndpoints.map(renderRow)}
				</ul>
			)}

			{visibleEndpoints.length > 0 ? (
				<p className="mt-2 hidden flex-wrap items-center gap-x-2.5 gap-y-1 px-1 text-[10px] text-muted group-focus-within/list:flex">
					{HINTS.filter((hint) => showHeaders || hint.label !== "fold").map((hint) => (
						<span key={hint.label} className="inline-flex items-center gap-1">
							<Kbd>{hint.keys}</Kbd>
							{hint.label}
						</span>
					))}
				</p>
			) : null}
		</div>
	);
};
