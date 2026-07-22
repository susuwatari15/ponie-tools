import type { FC } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Collapsible } from "@/components/ui/Collapsible";
import { cn } from "@/components/ui/cn";
import { ToolbarLabel } from "@/components/ui/Toolbar";
import type { PermissionCopyFormat } from "../_lib/formatPermissionShortList";
import { matchesSearch } from "../_lib/permissionDisplay";
import type { PermissionEntry, SectionId } from "../types";
import { PermissionPill } from "./PermissionPill";

type AllGroupView = "group1" | "group2";

type CopyHandler = (
	id: SectionId,
	items: PermissionEntry[],
	format: PermissionCopyFormat,
	moduleLabel: string,
) => void;

type AllPermissionsSectionProps = {
	group1Label: string;
	group2Label: string;
	shortModuleLabel: string;
	items: PermissionEntry[];
	searchQuery: string;
	isOpen: boolean;
	allGroupView: AllGroupView;
	onToggle: () => void;
	onGroupChange: (view: AllGroupView) => void;
	onCopyJson: CopyHandler;
	onCopyText: CopyHandler;
};

export const AllPermissionsSection: FC<AllPermissionsSectionProps> = ({
	group1Label,
	group2Label,
	shortModuleLabel,
	items,
	searchQuery,
	isOpen,
	allGroupView,
	onToggle,
	onGroupChange,
	onCopyJson,
	onCopyText,
}) => {
	const filteredItems = items.filter((entry) => matchesSearch(entry, searchQuery));
	const canCopy = filteredItems.length > 0;

	const groupTab = (view: AllGroupView, label: string) => (
		<button
			type="button"
			onClick={() => onGroupChange(view)}
			aria-pressed={allGroupView === view}
			className={cn(
				"rounded-md px-2.5 py-1 text-xs font-medium transition",
				allGroupView === view
					? "bg-accent/15 text-accent ring-1 ring-accent/40"
					: "border border-line text-muted hover:text-fg",
			)}
		>
			{label}
		</button>
	);

	return (
		<Collapsible
			open={isOpen}
			onToggle={onToggle}
			title={
				<span className="flex items-center gap-2">
					All permissions
					<Badge tone="neutral">{filteredItems.length}</Badge>
				</span>
			}
			description="Toggle the complete permission list by group."
			actions={
				<div className="flex flex-wrap items-center gap-1.5">
					{groupTab("group1", group1Label)}
					{groupTab("group2", group2Label)}
					<ToolbarLabel className="ml-1">JSON</ToolbarLabel>
					<Button size="sm" variant="ghost" disabled={!canCopy} onClick={() => onCopyJson("all", filteredItems, "full", shortModuleLabel)}>
						Full
					</Button>
					<Button size="sm" variant="ghost" disabled={!canCopy} title="Short text list" onClick={() => onCopyJson("all", filteredItems, "short", shortModuleLabel)}>
						Short
					</Button>
					<ToolbarLabel className="ml-1">Text</ToolbarLabel>
					<Button size="sm" variant="ghost" disabled={!canCopy} onClick={() => onCopyText("all", filteredItems, "full", shortModuleLabel)}>
						Full
					</Button>
					<Button size="sm" variant="ghost" disabled={!canCopy} onClick={() => onCopyText("all", filteredItems, "short", shortModuleLabel)}>
						Short
					</Button>
				</div>
			}
		>
			{filteredItems.length === 0 ? (
				<p className="text-sm text-muted">No permissions match the filter.</p>
			) : (
				<ul className="flex flex-wrap gap-2">
					{filteredItems.map((entry) => (
						<li key={entry.canonical}>
							<PermissionPill entry={entry} />
						</li>
					))}
				</ul>
			)}
		</Collapsible>
	);
};
