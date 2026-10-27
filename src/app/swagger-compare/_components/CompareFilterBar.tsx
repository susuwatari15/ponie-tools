"use client";

import { ChevronDown, Search, Tag } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/Input";
import { methodStyle } from "@/components/ui/methodColors";
import { Popover } from "@/components/ui/Popover";
import { STATUS_ORDER } from "../_lib/compareFilters";
import type { CompareStatus } from "../_lib/compareTree";
import type { SwaggerCompareController } from "../_hooks/useSwaggerCompare";

const statusLabel: Record<CompareStatus, string> = {
	added: "Added",
	removed: "Removed",
	changed: "Changed",
};

const statusChip: Record<CompareStatus, { on: string; off: string }> = {
	added: {
		on: "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
		off: "border-line text-muted hover:text-emerald-600 dark:hover:text-emerald-300",
	},
	removed: {
		on: "border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-300",
		off: "border-line text-muted hover:text-rose-600 dark:hover:text-rose-300",
	},
	changed: {
		on: "border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-200",
		off: "border-line text-muted hover:text-amber-700 dark:hover:text-amber-200",
	},
};

/** Tag lists longer than this get a search box. */
const TAG_SEARCH_THRESHOLD = 8;

const TagFilter: FC<{ m: SwaggerCompareController }> = ({ m }) => {
	const [query, setQuery] = useState("");
	const active = m.filters.tags;
	const q = query.trim().toLowerCase();
	const shown = q ? m.availableTags.filter((tag) => tag.toLowerCase().includes(q)) : m.availableTags;

	return (
		<Popover
			label="Filter by tag"
			align="start"
			panelClassName="w-64"
			trigger={({ triggerProps }) => (
				<Button
					size="sm"
					variant={active.length > 0 ? "primary" : "secondary"}
					leftIcon={<Tag className="h-3.5 w-3.5" />}
					rightIcon={<ChevronDown className="h-3 w-3" />}
					{...triggerProps}
				>
					{active.length === 0 ? "Tags" : active.length === 1 ? active[0] : `${active.length} tags`}
				</Button>
			)}
		>
			{() => (
				<>
					{m.availableTags.length > TAG_SEARCH_THRESHOLD ? (
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Find a tag…"
							aria-label="Find a tag"
							className="!py-1.5 !text-xs"
						/>
					) : null}
					<ul className="scroll-ide mt-1 max-h-64 space-y-0.5 overflow-y-auto">
						{shown.map((tag) => (
							<li key={tag}>
								<label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-fg transition hover:bg-raised">
									<input
										type="checkbox"
										checked={active.includes(tag)}
										onChange={() => m.filterActions.toggleTag(tag)}
										className="h-3.5 w-3.5 shrink-0 rounded border-line text-accent focus:ring-accent"
									/>
									<span className="min-w-0 truncate">{tag}</span>
								</label>
							</li>
						))}
						{shown.length === 0 ? (
							<li className="px-2 py-3 text-center text-xs text-muted">No tag matches.</li>
						) : null}
					</ul>
					{active.length > 0 ? (
						<button
							type="button"
							onClick={m.filterActions.clearTags}
							className="mt-1 px-2 text-[11px] font-medium text-accent hover:underline"
						>
							Clear tags
						</button>
					) : null}
				</>
			)}
		</Popover>
	);
};

/** Narrows the results, path tree and exports at once. Every filter is mirrored in the URL. */
export const CompareFilterBar: FC<{ m: SwaggerCompareController }> = ({ m }) => {
	const { filters, filterActions, statusCounts } = m;

	return (
		<div className="flex flex-wrap items-center gap-2">
			<div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Show statuses">
				{STATUS_ORDER.map((status) => {
					const on = filters.statuses.includes(status);
					return (
						<button
							key={status}
							type="button"
							aria-pressed={on}
							onClick={() => filterActions.toggleStatus(status)}
							className={cn(
								"inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition pointer-coarse:min-h-10",
								on ? statusChip[status].on : statusChip[status].off,
							)}
						>
							{statusLabel[status]}
							<span className="font-mono text-[11px] opacity-75">{statusCounts?.[status] ?? 0}</span>
						</button>
					);
				})}
			</div>

			{m.availableMethods.length > 1 ? (
				<>
					<span className="h-4 w-px bg-line" aria-hidden />
					<div className="flex flex-wrap gap-1" role="group" aria-label="Filter by method">
						{m.availableMethods.map((method) => {
							const on = filters.methods.includes(method);
							const style = methodStyle(method);
							return (
								<button
									key={method}
									type="button"
									onClick={() => filterActions.toggleMethod(method)}
									aria-pressed={on}
									className={cn(
										"rounded-md px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide transition pointer-coarse:min-h-10",
										on ? style.solid : style.chip,
									)}
								>
									{method}
								</button>
							);
						})}
					</div>
				</>
			) : null}

			{m.availableTags.length > 0 ? <TagFilter m={m} /> : null}

			<div className="min-w-[12rem] flex-1">
				<Input
					value={filters.query}
					onChange={(e) => filterActions.setQuery(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Escape" && filters.query) {
							e.preventDefault();
							filterActions.setQuery("");
						}
					}}
					placeholder="Filter path or summary…"
					icon={<Search className="h-3.5 w-3.5" />}
					mono
					aria-label="Filter results by path or summary"
					className="!py-1.5 !text-xs"
				/>
			</div>

			<label
				className={cn(
					"inline-flex cursor-pointer items-center gap-1.5 text-xs",
					m.docsOnlyCount > 0 ? "text-muted" : "text-muted/60",
				)}
				title="Hide changes that only touch summary, description or example(s)"
			>
				<input
					type="checkbox"
					checked={filters.ignoreDocsOnly}
					onChange={(e) => filterActions.setIgnoreDocsOnly(e.target.checked)}
					className="h-3.5 w-3.5 rounded border-line text-accent focus:ring-accent"
				/>
				Hide docs-only
				<span className="font-mono text-[11px]">({m.docsOnlyCount})</span>
			</label>

			{m.filtering ? (
				<button
					type="button"
					onClick={filterActions.reset}
					className="text-xs font-medium text-accent hover:underline"
				>
					Reset
				</button>
			) : null}
		</div>
	);
};
