import { ChevronDown } from "lucide-react";
import type { FC } from "react";
import type { PermissionCopyFormat } from "../_lib/formatPermissionShortList";
import { matchesSearch } from "../_lib/permissionDisplay";
import { listSectionBoxClass, mutedText } from "../styles";
import type { PermissionEntry, SectionId } from "../types";
import { PermissionPill } from "./PermissionPill";

type PermissionListSectionProps = {
	id: SectionId;
	title: string;
	description: string;
	items: PermissionEntry[];
	isOpen: boolean;
	search: string;
	emptyMessage: string;
	onToggle: (id: SectionId) => void;
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

const headingText = "text-slate-900 dark:text-slate-100";

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
	copyStatus,
}) => {
	const filteredItems = items.filter((entry) => matchesSearch(entry, search));

	const btnClass =
		"rounded-md border border-slate-300 px-2 py-1 text-xs transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-500/50 dark:hover:bg-slate-800/30";

	const canCopy = filteredItems.length > 0;

	return (
		<section className={`rounded-xl border ${listSectionBoxClass}`}>
			<div className="flex items-center justify-between gap-3 border-b border-inherit px-4 py-3">
				<button
					type="button"
					className="flex min-w-0 flex-1 items-center gap-3 text-left"
					onClick={() => onToggle(id)}
				>
					<ChevronDown
						className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
							isOpen ? "rotate-0" : "-rotate-90"
						}`}
					/>
					<div className="min-w-0">
						<h3 className={`truncate text-sm font-semibold ${headingText}`}>
							{title}{" "}
							<span className="ml-2 rounded-full border border-current/30 px-2 py-0.5 text-xs">
								{filteredItems.length}
							</span>
						</h3>
						<p className={`text-xs ${mutedText}`}>{description}</p>
					</div>
				</button>
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">JSON</span>
					<button
						type="button"
						disabled={!canCopy}
						onClick={() => onCopyJson(id, filteredItems, "full", title)}
						className={btnClass}
					>
						Full
					</button>
					<button
						type="button"
						disabled={!canCopy}
						title="Short text list (not JSON)"
						onClick={() => onCopyJson(id, filteredItems, "short", title)}
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
						onClick={() => onCopyText(id, filteredItems, "full", title)}
						className={btnClass}
					>
						Full
					</button>
					<button
						type="button"
						disabled={!canCopy}
						onClick={() => onCopyText(id, filteredItems, "short", title)}
						className={btnClass}
					>
						Short
					</button>
				</div>
			</div>
			<div
				className="grid transition-[grid-template-rows,opacity] duration-300"
				style={{ gridTemplateRows: isOpen ? "1fr" : "0fr", opacity: isOpen ? 1 : 0.65 }}
			>
				<div className="overflow-hidden">
					<div className="space-y-3 px-4 py-3">
						{copyStatus ? <p className={`text-xs ${mutedText}`}>{copyStatus}</p> : null}
						{filteredItems.length === 0 ? (
							<p className={`text-sm ${mutedText}`}>{emptyMessage}</p>
						) : (
							<ul className="flex flex-wrap gap-2">
								{filteredItems.map((entry) => (
									<li key={entry.canonical}>
										<PermissionPill entry={entry} />
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>
		</section>
	);
};
