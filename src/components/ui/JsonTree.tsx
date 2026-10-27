"use client";

import { ChevronRight, ChevronsDownUp, ChevronsUpDown, Copy, Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useState, type FC, type ReactNode } from "react";
import { Button } from "./Button";
import { cn } from "./cn";
import { IconButton } from "./IconButton";
import { Input } from "./Input";
import { JSON_TOKEN_CLASS as TOKEN_CLASS } from "./jsonTokenColors";
import { useCopy } from "./useCopy";

type JsonValue = unknown;

type JsonTreeProps = {
	/** Parsed JSON value to explore. */
	value: JsonValue;
	/** Containers shallower than this start expanded. */
	defaultExpandDepth?: number;
	className?: string;
};

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const MAX_STRING_PREVIEW = 160;
const INDENT = 14;

const isContainer = (value: JsonValue): value is Record<string, JsonValue> | JsonValue[] =>
	typeof value === "object" && value !== null;

const entriesOf = (value: Record<string, JsonValue> | JsonValue[]): Array<[string | number, JsonValue]> =>
	Array.isArray(value) ? value.map((item, index) => [index, item]) : Object.entries(value);

/** JS accessor path, e.g. `$.paths["/users"].get` — also the node's id. */
const childPath = (parent: string, key: string | number): string => {
	if (typeof key === "number") return `${parent}[${key}]`;
	return IDENTIFIER.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`;
};

const primitiveText = (value: JsonValue): string =>
	typeof value === "string" ? JSON.stringify(value) : String(value);

const primitiveClass = (value: JsonValue): string => {
	if (value === null) return TOKEN_CLASS.null;
	if (typeof value === "string") return TOKEN_CLASS.string;
	if (typeof value === "number") return TOKEN_CLASS.number;
	if (typeof value === "boolean") return TOKEN_CLASS.boolean;
	return "text-muted";
};

/** Wraps case-insensitive matches of `query` in a highlight. */
const highlight = (text: string, query: string): ReactNode => {
	if (!query) return text;
	const lower = text.toLowerCase();
	const parts: ReactNode[] = [];
	let cursor = 0;
	let hit = lower.indexOf(query, cursor);
	while (hit !== -1) {
		if (hit > cursor) parts.push(text.slice(cursor, hit));
		parts.push(
			<mark key={hit} className="rounded-sm bg-amber-300/70 text-inherit dark:bg-amber-400/40">
				{text.slice(hit, hit + query.length)}
			</mark>,
		);
		cursor = hit + query.length;
		hit = lower.indexOf(query, cursor);
	}
	if (cursor < text.length) parts.push(text.slice(cursor));
	return parts;
};

type SearchResult = { matches: Set<string>; visible: Set<string>; ancestors: Set<string> };

/** Every node whose key or primitive value contains `query`, plus their ancestors. */
const searchTree = (root: JsonValue, query: string): SearchResult => {
	const matches = new Set<string>();
	const visible = new Set<string>();
	const ancestors = new Set<string>();
	const walk = (value: JsonValue, path: string, key: string | number | null, trail: string[]) => {
		const keyHit = key !== null && String(key).toLowerCase().includes(query);
		const valueHit = !isContainer(value) && primitiveText(value).toLowerCase().includes(query);
		if (keyHit || valueHit) {
			matches.add(path);
			visible.add(path);
			for (const ancestor of trail) {
				visible.add(ancestor);
				ancestors.add(ancestor);
			}
		}
		if (isContainer(value)) {
			for (const [childKey, child] of entriesOf(value)) {
				walk(child, childPath(path, childKey), childKey, [...trail, path]);
			}
		}
	};
	walk(root, "$", null, []);
	return { matches, visible, ancestors };
};

type TreeContext = {
	query: string;
	search: SearchResult | null;
	isOpen: (path: string, depth: number) => boolean;
	toggle: (path: string, depth: number) => void;
	selectedPath: string | null;
	onSelect: (path: string, value: JsonValue) => void;
};

const collapsedPreview = (value: Record<string, JsonValue> | JsonValue[]): string => {
	if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? "item" : "items"}`;
	const keys = Object.keys(value);
	const shown = keys.slice(0, 3).join(", ");
	return keys.length > 3 ? `${shown}, … +${keys.length - 3}` : shown;
};

const TreeNode: FC<{
	name: string | number | null;
	value: JsonValue;
	path: string;
	depth: number;
	ctx: TreeContext;
	/** Inside a matched node every descendant is shown, not just other matches. */
	unfiltered?: boolean;
}> = ({ name, value, path, depth, ctx, unfiltered = false }) => {
	const container = isContainer(value);
	const open = container && ctx.isOpen(path, depth);
	const selected = ctx.selectedPath === path;
	const matched = ctx.search?.matches.has(path) ?? false;
	const [openBracket, closeBracket] = Array.isArray(value) ? ["[", "]"] : ["{", "}"];

	const showAll = unfiltered || matched;
	const children = container
		? entriesOf(value).filter(
				([key]) => showAll || !ctx.search || ctx.search.visible.has(childPath(path, key)),
			)
		: [];

	const text = container ? "" : primitiveText(value);
	const clipped = text.length > MAX_STRING_PREVIEW ? `${text.slice(0, MAX_STRING_PREVIEW)}…` : text;

	return (
		<div role="treeitem" aria-expanded={container ? open : undefined} aria-selected={selected}>
			<button
				type="button"
				onClick={() => {
					ctx.onSelect(path, value);
					if (container) ctx.toggle(path, depth);
				}}
				className={cn(
					"flex w-full min-w-0 items-start gap-1 rounded py-px pr-2 text-left font-mono text-xs leading-5 transition-colors",
					selected ? "bg-accent/15" : "hover:bg-raised",
					matched && !selected && "bg-amber-300/10 dark:bg-amber-400/10",
				)}
				style={{ paddingLeft: depth * INDENT + 4 }}
				title={path}
			>
				<span className="mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center text-muted">
					{container ? (
						<ChevronRight
							className={cn("h-3 w-3 transition-transform", open && "rotate-90")}
							aria-hidden
						/>
					) : null}
				</span>
				{name !== null ? (
					<span className={cn("shrink-0", typeof name === "number" ? "text-muted" : TOKEN_CLASS.key)}>
						{typeof name === "number" ? name : highlight(name, ctx.query)}
						<span className="text-muted">:</span>
					</span>
				) : null}
				{container ? (
					<span className="min-w-0 truncate text-muted">
						{openBracket}
						{open ? null : (
							<>
								<span className="px-1 text-[11px] italic opacity-80">{collapsedPreview(value)}</span>
								{closeBracket}
							</>
						)}
					</span>
				) : (
					<span className={cn("min-w-0 break-all", primitiveClass(value))}>
						{highlight(clipped, ctx.query)}
					</span>
				)}
			</button>
			{open ? (
				<div role="group">
					{children.map(([key, child]) => (
						<TreeNode
							key={key}
							name={key}
							value={child}
							path={childPath(path, key)}
							depth={depth + 1}
							ctx={ctx}
							unfiltered={showAll}
						/>
					))}
					<div
						className="font-mono text-xs leading-5 text-muted"
						style={{ paddingLeft: depth * INDENT + 22 }}
					>
						{closeBracket}
					</div>
				</div>
			) : null}
		</div>
	);
};

/**
 * Interactive, searchable JSON explorer with collapsible nodes and copyable
 * paths — the one tree used by the minifier output and the JSON Formatter.
 */
export const JsonTree: FC<JsonTreeProps> = ({ value, defaultExpandDepth = 3, className }) => {
	const copyToClipboard = useCopy();
	const [baseDepth, setBaseDepth] = useState(defaultExpandDepth);
	// Per-node choices layered over the depth rule; cleared by expand/collapse all.
	const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
	const [rawQuery, setRawQuery] = useState("");
	const [selected, setSelected] = useState<{ path: string; value: JsonValue } | null>(null);

	const query = useDeferredValue(rawQuery.trim().toLowerCase());
	const search = useMemo(() => (query ? searchTree(value, query) : null), [value, query]);

	const isOpen = (path: string, depth: number) => {
		const override = overrides.get(path);
		if (override !== undefined) return override;
		// While searching, open exactly the branches that lead to a match.
		if (search) return search.ancestors.has(path);
		return depth < baseDepth;
	};

	const toggle = (path: string, depth: number) => {
		const next = !isOpen(path, depth);
		setOverrides((previous) => new Map(previous).set(path, next));
	};

	const setAll = (depth: number) => {
		setBaseDepth(depth);
		setOverrides(new Map());
	};

	const copy = (label: string, text: string) =>
		copyToClipboard(text, `${label} copied to clipboard`);

	const ctx: TreeContext = {
		query,
		search,
		isOpen,
		toggle,
		selectedPath: selected?.path ?? null,
		onSelect: (path, nodeValue) => setSelected({ path, value: nodeValue }),
	};

	return (
		<div className={cn("flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-ink/40 dark:bg-ink/60", className)}>
			<div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface/70 px-2 py-2">
				<div className="min-w-[180px] flex-1">
					<Input
						value={rawQuery}
						onChange={(event) => {
							setRawQuery(event.target.value);
							setOverrides(new Map());
						}}
						placeholder="Find key or value…"
						aria-label="Search JSON"
						icon={<Search className="h-3.5 w-3.5" />}
						className="py-1.5 text-xs"
						mono
					/>
				</div>
				{search ? (
					<span className="font-mono text-[10px] text-muted">
						{search.matches.size} {search.matches.size === 1 ? "match" : "matches"}
					</span>
				) : null}
				<div className="flex items-center gap-1">
					<IconButton label="Expand all" className="h-7 w-7" onClick={() => setAll(Infinity)}>
						<ChevronsUpDown className="h-3.5 w-3.5" />
					</IconButton>
					<IconButton label="Collapse all" className="h-7 w-7" onClick={() => setAll(1)}>
						<ChevronsDownUp className="h-3.5 w-3.5" />
					</IconButton>
				</div>
			</div>

			<div className="scroll-ide min-h-0 flex-1 overflow-auto p-2" role="tree" aria-label="JSON tree">
				{search && search.matches.size === 0 ? (
					<p className="px-2 py-6 text-center text-xs text-muted">Nothing matches “{rawQuery.trim()}”.</p>
				) : (
					<TreeNode name={null} value={value} path="$" depth={0} ctx={ctx} />
				)}
			</div>

			{selected ? (
				<div className="flex items-center gap-2 border-t border-line bg-surface/70 px-2 py-1.5">
					<code className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg" title={selected.path}>
						{selected.path}
					</code>
					<Button
						size="sm"
						variant="ghost"
						onClick={() => copy("Path", selected.path)}
						leftIcon={<Copy className="h-3 w-3" />}
					>
						Path
					</Button>
					<Button
						size="sm"
						variant="ghost"
						onClick={() =>
							copy(
								"Value",
								typeof selected.value === "string"
									? selected.value
									: JSON.stringify(selected.value, null, 2),
							)
						}
						leftIcon={<Copy className="h-3 w-3" />}
					>
						Value
					</Button>
					<IconButton label="Clear selection" className="h-6 w-6" onClick={() => setSelected(null)}>
						<X className="h-3 w-3" />
					</IconButton>
				</div>
			) : null}
		</div>
	);
};
