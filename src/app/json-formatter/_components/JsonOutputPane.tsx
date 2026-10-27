"use client";

import { Braces, Copy, ListTree, Minimize2 } from "lucide-react";
import type { FC } from "react";
import dynamic from "next/dynamic";
import {
	Button,
	Card,
	EmptyState,
	JsonView,
	SegmentedControl,
	type SegmentedOption,
	Skeleton,
	SkeletonGroup,
} from "@/components/ui";
import type { UseJsonFormatter, ViewMode } from "../_hooks/useJsonFormatter";

/** The tree view is opt-in, so it loads on demand rather than with the page. */
const JsonTree = dynamic(() => import("@/components/ui/JsonTree").then((mod) => mod.JsonTree), {
	loading: () => (
		<SkeletonGroup label="Loading tree view" className="h-full space-y-2 p-1">
			{["w-1/3", "w-1/2", "w-2/5", "w-3/5", "w-1/4"].map((width, index) => (
				<Skeleton key={index} className={`h-3 ${width}`} />
			))}
		</SkeletonGroup>
	),
});

const MODES: SegmentedOption<ViewMode>[] = [
	{ value: "beautify", label: "Beautify", icon: Braces },
	{ value: "tree", label: "Tree", icon: ListTree },
	{ value: "minify", label: "Minify", icon: Minimize2 },
];

export const JsonOutputPane: FC<{ m: UseJsonFormatter }> = ({ m }) => {
	const hasOutput = !m.isEmpty && !m.error;

	return (
		<Card
			flush
			className="flex min-h-[560px] flex-col overflow-hidden lg:min-h-0"
		>
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
				<div className="min-w-0">
					<p className="font-mono text-[10px] uppercase tracking-widest text-muted">
						// output
					</p>
					<h2 className="text-sm font-semibold text-fg">Result</h2>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-1.5">
					<SegmentedControl
						value={m.mode}
						onChange={m.setMode}
						options={MODES}
						label="Output view"
					/>
					<Button
						size="sm"
						disabled={!hasOutput}
						onClick={m.copy}
						leftIcon={<Copy className="h-3.5 w-3.5" />}
					>
						Copy
					</Button>
				</div>
			</div>

			<div className="min-h-0 flex-1 p-3">
				{m.isEmpty ? (
					<EmptyState
						title="Nothing to show yet"
						description="Paste JSON on the left to beautify, minify, or explore it."
						className="h-full"
					/>
				) : m.error ? (
					<EmptyState
						tone="error"
						title="Invalid JSON"
						description={`Line ${m.error.line}, Col ${m.error.column} — ${m.error.message}`}
						className="h-full"
					/>
				) : m.mode === "tree" ? (
					<JsonTree value={m.parsed} defaultExpandDepth={2} className="h-full" />
				) : (
					<JsonView
						value={m.mode === "minify" ? m.minified : m.beautified}
						className={
							m.mode === "minify"
								? "h-full whitespace-pre-wrap break-all rounded-lg border border-line bg-ink/40 p-3 dark:bg-ink/60"
								: "h-full rounded-lg border border-line bg-ink/40 p-3 dark:bg-ink/60"
						}
					/>
				)}
			</div>
		</Card>
	);
};
