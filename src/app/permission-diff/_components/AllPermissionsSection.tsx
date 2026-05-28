import { ChevronDown } from "lucide-react";
import type { FC } from "react";
import type { PermissionCopyFormat } from "../_lib/formatPermissionShortList";
import { matchesSearch } from "../_lib/permissionDisplay";
import { mutedText, panelClasses } from "../styles";
import type { PermissionEntry, SectionId } from "../types";
import { PermissionPill } from "./PermissionPill";

type AllGroupView = "group1" | "group2";

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
	onCopyJson: (
		id: SectionId,
		items: PermissionEntry[],
		format: PermissionCopyFormat,
		moduleLabel: string
	) => void;
	onCopyText: (
		id: SectionId,
		items: PermissionEntry[],
		format: PermissionCopyFormat,
		moduleLabel: string
	) => void;
	copyStatus: string | null;
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
	copyStatus,
}) => {
	const filteredItems = items.filter((entry) => matchesSearch(entry, searchQuery));

	const btnClass =
		"rounded-md border border-slate-500/50 px-2 py-1 text-xs transition hover:bg-slate-800/30 disabled:cursor-not-allowed disabled:opacity-40";

	const canCopy = filteredItems.length > 0;

	return (
		<div className={`rounded-xl border ${panelClasses}`}>
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-inherit px-4 py-3">
				<button
					type="button"
					className="flex min-w-0 flex-1 items-center gap-3 text-left"
					onClick={onToggle}
				>
					<ChevronDown
						className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
							isOpen ? "rotate-0" : "-rotate-90"
						}`}
					/>
					<div>
						<h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
							All permissions{" "}
							<span className="ml-2 rounded-full border border-current/30 px-2 py-0.5 text-xs">
								{filteredItems.length}
							</span>
						</h3>
						<p className={`text-xs ${mutedText}`}>Toggle complete permission list by group.</p>
					</div>
				</button>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => onGroupChange("group1")}
						className={`rounded-md px-2.5 py-1 text-xs transition ${
							allGroupView === "group1"
								? "bg-accent/20 text-accent ring-1 ring-accent/50"
								: "border border-slate-500/50"
						}`}
					>
						{group1Label}
					</button>
					<button
						type="button"
						onClick={() => onGroupChange("group2")}
						className={`rounded-md px-2.5 py-1 text-xs transition ${
							allGroupView === "group2"
								? "bg-accent/20 text-accent ring-1 ring-accent/50"
								: "border border-slate-500/50"
						}`}
					>
						{group2Label}
					</button>
					<span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">JSON</span>
					<button
						type="button"
						disabled={!canCopy}
						onClick={() => onCopyJson("all", filteredItems, "full", shortModuleLabel)}
						className={btnClass}
					>
						Full
					</button>
					<button
						type="button"
						disabled={!canCopy}
						title="Short text list (not JSON)"
						onClick={() => onCopyJson("all", filteredItems, "short", shortModuleLabel)}
						className={btnClass}
					>
						Short
					</button>
					<span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
						Text
					</span>
					<button
						type="button"
						disabled={!canCopy}
						onClick={() => onCopyText("all", filteredItems, "full", shortModuleLabel)}
						className={btnClass}
					>
						Full
					</button>
					<button
						type="button"
						disabled={!canCopy}
						onClick={() => onCopyText("all", filteredItems, "short", shortModuleLabel)}
						className={btnClass}
					>
						Short
					</button>
				</div>
			</div>
			<div
				className="grid transition-[grid-template-rows,opacity] duration-300"
				style={{
					gridTemplateRows: isOpen ? "1fr" : "0fr",
					opacity: isOpen ? 1 : 0.65,
				}}
			>
				<div className="overflow-hidden">
					<div className="space-y-3 px-4 py-3">
						{copyStatus ? <p className={`text-xs ${mutedText}`}>{copyStatus}</p> : null}
						<ul className="flex flex-wrap gap-2">
							{filteredItems.map((entry) => (
								<li key={entry.canonical}>
									<PermissionPill entry={entry} />
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
};
