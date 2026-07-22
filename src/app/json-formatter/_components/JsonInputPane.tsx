"use client";

import { Trash2 } from "lucide-react";
import type { FC } from "react";
import { Button, Card, Textarea } from "@/components/ui";
import type { UseJsonFormatter } from "../_hooks/useJsonFormatter";

export const JsonInputPane: FC<{ m: UseJsonFormatter }> = ({ m }) => (
	<Card flush className="flex min-h-[560px] flex-col overflow-hidden lg:min-h-0">
		<div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
			<div className="min-w-0">
				<p className="font-mono text-[10px] uppercase tracking-widest text-muted">
					// input
				</p>
				<h2 className="text-sm font-semibold text-fg">Raw JSON</h2>
			</div>
			<Button
				size="sm"
				variant="ghost"
				disabled={m.isEmpty}
				onClick={m.clear}
				leftIcon={<Trash2 className="h-3.5 w-3.5" />}
			>
				Clear
			</Button>
		</div>

		<div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
			<Textarea
				value={m.input}
				onChange={(e) => m.setInput(e.target.value)}
				placeholder="Paste or type JSON here…"
				spellCheck={false}
				className="min-h-0 flex-1 resize-none"
			/>
			{m.error ? (
				<p className="shrink-0 rounded-md border border-del/40 bg-del/5 px-3 py-2 font-mono text-xs text-del">
					Line {m.error.line}, Col {m.error.column} — {m.error.message}
				</p>
			) : null}
		</div>
	</Card>
);
