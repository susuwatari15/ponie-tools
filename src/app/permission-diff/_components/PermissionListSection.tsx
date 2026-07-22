import type { FC } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Collapsible } from "@/components/ui/Collapsible";
import { ToolbarLabel } from "@/components/ui/Toolbar";
import type { PermissionCopyFormat } from "../_lib/formatPermissionShortList";
import { matchesSearch } from "../_lib/permissionDisplay";
import type { PermissionEntry, SectionId } from "../types";
import { PermissionPill } from "./PermissionPill";

type CopyHandler = (
	id: SectionId,
	items: PermissionEntry[],
	format: PermissionCopyFormat,
	moduleLabel: string,
) => void;

type PermissionListSectionProps = {
	id: SectionId;
	title: string;
	description: string;
	items: PermissionEntry[];
	isOpen: boolean;
	search: string;
	emptyMessage: string;
	onToggle: (id: SectionId) => void;
	onCopyJson: CopyHandler;
	onCopyText: CopyHandler;
};

export const PermissionListSection: FC<PermissionListSectionProps> = ({
	id,
	title,
	description,
	items,
	isOpen,
	search,
	emptyMessage,
	onToggle,
	onCopyJson,
	onCopyText,
}) => {
	const filteredItems = items.filter((entry) => matchesSearch(entry, search));
	const canCopy = filteredItems.length > 0;

	return (
		<Collapsible
			open={isOpen}
			onToggle={() => onToggle(id)}
			title={
				<span className="flex items-center gap-2">
					{title}
					<Badge tone="neutral">{filteredItems.length}</Badge>
				</span>
			}
			description={description}
			actions={
				<div className="flex flex-wrap items-center gap-1.5">
					<ToolbarLabel>JSON</ToolbarLabel>
					<Button size="sm" variant="ghost" disabled={!canCopy} onClick={() => onCopyJson(id, filteredItems, "full", title)}>
						Full
					</Button>
					<Button size="sm" variant="ghost" disabled={!canCopy} title="Short text list" onClick={() => onCopyJson(id, filteredItems, "short", title)}>
						Short
					</Button>
					<ToolbarLabel className="ml-1">Text</ToolbarLabel>
					<Button size="sm" variant="ghost" disabled={!canCopy} onClick={() => onCopyText(id, filteredItems, "full", title)}>
						Full
					</Button>
					<Button size="sm" variant="ghost" disabled={!canCopy} onClick={() => onCopyText(id, filteredItems, "short", title)}>
						Short
					</Button>
				</div>
			}
		>
			{filteredItems.length === 0 ? (
				<p className="text-sm text-muted">{emptyMessage}</p>
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
