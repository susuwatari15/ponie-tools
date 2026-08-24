"use client";

import { ChevronDown, FolderTree, Search } from "lucide-react";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/Input";
import { MethodBadge } from "@/components/ui/Badge";
import type { OpenApiCompareResult } from "@/lib/openApiCompare";
import {
	allFolderKeys,
	buildCompareEntries,
	buildCompareTree,
	defaultExpandedKeys,
	filterCompareEntries,
	type CompareCounts,
	type CompareStatus,
	type CompareTreeFolder,
	type CompareTreeNode,
} from "../_lib/compareTree";

const statusDot: Record<CompareStatus, string> = {
	added: "bg-emerald-500",
	removed: "bg-rose-500",
	changed: "bg-amber-500",
};

const statusText: Record<CompareStatus, string> = {
	added: "text-emerald-600 dark:text-emerald-300",
	removed: "text-rose-600 dark:text-rose-300",
	changed: "text-amber-700 dark:text-amber-200",
};

const statusLabel: Record<CompareStatus, string> = {
	added: "Added",
	removed: "Removed",
	changed: "Changed",
};

const countPrefix: Record<CompareStatus, string> = {
	added: "+",
	removed: "−",
	changed: "~",
};

const COUNT_ORDER: CompareStatus[] = ["added", "changed", "removed"];

const CountBadges: FC<{ counts: CompareCounts }> = ({ counts }) => (
	<span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px]">
		{COUNT_ORDER.filter((status) => counts[status] > 0).map((status) => (
			<span key={status} className={statusText[status]}>
				{countPrefix[status]}
				{counts[status]}
			</span>
		))}
	</span>
);

type TreeRowsProps = {
	nodes: CompareTreeNode[];
	depth: number;
	expanded: Set<string>;
	onToggle: (key: string) => void;
	selectedEndpointId?: string | null;
	onSelectEndpoint: (endpointId: string) => void;
};

const TreeRows: FC<TreeRowsProps> = ({
	nodes,
	depth,
	expanded,
	onToggle,
	selectedEndpointId,
	onSelectEndpoint,
}) => (
	<>
		{nodes.map((node) => {
			const indent = { paddingLeft: `${depth * 12 + 6}px` };

			if (node.kind === "leaf") {
				const active = node.endpointId === selectedEndpointId;
				return (
					<button
						key={node.key}
						type="button"
						onClick={() => onSelectEndpoint(node.endpointId)}
						title={`${statusLabel[node.status]} · ${node.endpointId}${
							node.summary ? ` — ${node.summary}` : ""
						}`}
						style={indent}
						className={cn(
							"flex w-full items-center gap-2 rounded py-1 pr-1.5 text-left transition hover:bg-raised",
							active && "bg-accent/10 ring-1 ring-inset ring-accent/40",
						)}
					>
						<span
							className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot[node.status])}
							aria-hidden
						/>
						<MethodBadge method={node.method} />
						<span
							className={cn(
								"min-w-0 flex-1 truncate font-mono text-[11px]",
								statusText[node.status],
							)}
						>
							{node.summary || node.path}
						</span>
					</button>
				);
			}

			const isOpen = expanded.has(node.key);
			return (
				<div key={node.key}>
					<button
						type="button"
						onClick={() => onToggle(node.key)}
						aria-expanded={isOpen}
						title={node.key}
						style={indent}
						className="flex w-full items-center gap-1.5 rounded py-1 pr-1.5 text-left transition hover:bg-raised"
					>
						<ChevronDown
							className={cn(
								"h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-150",
								isOpen ? "rotate-0" : "-rotate-90",
							)}
							aria-hidden
						/>
						<span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg">
							{node.label}
						</span>
						<CountBadges counts={node.counts} />
					</button>
					{isOpen ? (
						<TreeRows
							nodes={node.children}
							depth={depth + 1}
							expanded={expanded}
							onToggle={onToggle}
							selectedEndpointId={selectedEndpointId}
							onSelectEndpoint={onSelectEndpoint}
						/>
					) : null}
				</div>
			);
		})}
	</>
);

type SwaggerCompareTreeProps = {
	result: OpenApiCompareResult | null;
	selectedEndpointId?: string | null;
	onSelectEndpoint: (endpointId: string) => void;
	className?: string;
};

/** Path-segment tree of the diffed endpoints; clicking a leaf jumps to its result row. */
export const SwaggerCompareTree: FC<SwaggerCompareTreeProps> = ({
	result,
	selectedEndpointId,
	onSelectEndpoint,
	className,
}) => {
	const [query, setQuery] = useState("");
	const [expanded, setExpanded] = useState<Set<string>>(new Set());
	const [prevResult, setPrevResult] = useState<OpenApiCompareResult | null>(null);

	const entries = useMemo(
		() => (result?.ok ? buildCompareEntries(result) : []),
		[result],
	);

	const baseRoots = useMemo(() => buildCompareTree(entries), [entries]);

	// Reset search + expansion whenever a new comparison arrives.
	if (result !== prevResult) {
		setPrevResult(result);
		setQuery("");
		setExpanded(new Set(defaultExpandedKeys(baseRoots)));
	}

	const filtering = query.trim().length > 0;
	const roots = useMemo(
		() =>
			filtering ? buildCompareTree(filterCompareEntries(entries, query)) : baseRoots,
		[filtering, entries, query, baseRoots],
	);

	// While filtering, show every surviving branch.
	const effectiveExpanded = useMemo(
		() => (filtering ? new Set(allFolderKeys(roots)) : expanded),
		[filtering, roots, expanded],
	);

	const toggle = (key: string) =>
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});

	const totalLeaves = entries.length;
	const shownLeaves = roots.reduce(
		(sum: number, node: CompareTreeFolder) => sum + node.total,
		0,
	);

	if (!result?.ok || totalLeaves === 0) return null;

	return (
		<aside
			className={cn(
				"flex min-h-0 flex-col overflow-hidden rounded-card border border-line bg-surface",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
				<p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
					<FolderTree className="h-3.5 w-3.5" aria-hidden />
					paths
					<span className="text-accent">{shownLeaves}</span>
				</p>
				<div className="flex items-center gap-2 text-[10px]">
					<button
						type="button"
						onClick={() => setExpanded(new Set(allFolderKeys(baseRoots)))}
						className="font-medium text-accent hover:underline"
					>
						Expand
					</button>
					<span className="text-line">|</span>
					<button
						type="button"
						onClick={() => setExpanded(new Set())}
						className="font-medium text-accent hover:underline"
					>
						Collapse
					</button>
				</div>
			</div>

			<div className="border-b border-line px-3 py-2">
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Filter paths…"
					icon={<Search className="h-3.5 w-3.5" />}
					mono
					className="py-1.5 text-xs"
					aria-label="Filter paths"
				/>
			</div>

			<div className="scroll-ide min-h-0 flex-1 overflow-y-auto px-1.5 py-2">
				{shownLeaves === 0 ? (
					<p className="px-2 py-4 text-center text-xs text-muted">
						No path matches “{query.trim()}”.
					</p>
				) : (
					<TreeRows
						nodes={roots}
						depth={0}
						expanded={effectiveExpanded}
						onToggle={toggle}
						selectedEndpointId={selectedEndpointId}
						onSelectEndpoint={onSelectEndpoint}
					/>
				)}
			</div>
		</aside>
	);
};
