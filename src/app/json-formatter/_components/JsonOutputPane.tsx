"use client";

import { Braces, Copy, ListTree, Minimize2 } from "lucide-react";
import type { FC } from "react";
import { Button, Card, EmptyState, JsonView } from "@/components/ui";
import type { UseJsonFormatter, ViewMode } from "../_hooks/useJsonFormatter";
import { JsonTree } from "./JsonTree";

const MODES: { mode: ViewMode; label: string; icon: typeof Braces }[] = [
	{ mode: "beautify", label: "Beautify", icon: Braces },
	{ mode: "tree", label: "Tree", icon: ListTree },
	{ mode: "minify", label: "Minify", icon: Minimize2 },
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
					{MODES.map(({ mode, label, icon: Icon }) => (
						<Button
							key={mode}
							size="sm"
							variant={m.mode === mode ? "primary" : "secondary"}
							onClick={() => m.setMode(mode)}
							leftIcon={<Icon className="h-3.5 w-3.5" />}
						>
							{label}
						</Button>
					))}
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
					<div className="scroll-ide h-full overflow-auto rounded-lg border border-line bg-ink/40 p-3 font-mono text-xs leading-6 dark:bg-ink/60">
						<JsonTree value={m.parsed} />
					</div>
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
