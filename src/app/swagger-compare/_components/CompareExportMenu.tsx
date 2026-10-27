"use client";

import { ChevronDown, Copy, FileDown, FileJson, Share } from "lucide-react";
import type { FC, ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Popover } from "@/components/ui/Popover";
import type { SwaggerCompareController } from "../_hooks/useSwaggerCompare";

type ExportTarget = Parameters<SwaggerCompareController["exportDiff"]>[0];

const ITEMS: { target: ExportTarget; label: string; icon: ReactNode }[] = [
	{ target: "copy-md", label: "Copy Markdown", icon: <Copy className="h-3.5 w-3.5" /> },
	{ target: "download-md", label: "Download .md", icon: <FileDown className="h-3.5 w-3.5" /> },
	{ target: "download-json", label: "Download .json", icon: <FileJson className="h-3.5 w-3.5" /> },
];

/** Exports the diff as shown — the active filters apply. */
export const CompareExportMenu: FC<{ m: SwaggerCompareController }> = ({ m }) => (
	<Popover
		label="Export diff"
		panelClassName="w-56 p-1"
		trigger={({ triggerProps }) => (
			<Button
				size="sm"
				variant="ghost"
				disabled={!m.filteredResult}
				leftIcon={<Share className="h-3.5 w-3.5" />}
				rightIcon={<ChevronDown className="h-3 w-3" />}
				{...triggerProps}
			>
				Export
			</Button>
		)}
	>
		{(close) => (
			<>
				{ITEMS.map(({ target, label, icon }) => (
					<button
						key={target}
						type="button"
						onClick={() => {
							void m.exportDiff(target);
							close();
						}}
						className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-fg transition hover:bg-raised"
					>
						<span className="text-muted">{icon}</span>
						{label}
					</button>
				))}
				{m.filtering ? (
					<p className="mt-1 border-t border-line px-2 pb-1 pt-1.5 text-[11px] text-muted">
						Only what the active filters show is exported.
					</p>
				) : null}
			</>
		)}
	</Popover>
);
