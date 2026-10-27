import type { FC } from "react";
import { useDensity } from "@/components/layout/PreferencesProvider";
import { cn } from "@/components/ui/cn";
import type { PermissionEntry } from "../types";
import { getMethodPillClass } from "../_lib/permissionDisplay";

type PermissionPillProps = {
	entry: PermissionEntry;
	compact?: boolean;
};

export const PermissionPill: FC<PermissionPillProps> = ({ entry, compact = false }) => {
	const method = entry.action || entry.type;
	return (
		<span
			className={cn(
				"inline-flex max-w-full break-all rounded-full border font-mono",
				compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
				getMethodPillClass(entry),
			)}
			title={JSON.stringify(entry.raw, null, 2)}
		>
			[{method}] {entry.resource}
		</span>
	);
};

/** Wrapping list of permission pills; spacing follows the density preference. */
export const PermissionPillList: FC<{ items: PermissionEntry[] }> = ({ items }) => {
	const compact = useDensity() === "compact";
	return (
		<ul className={cn("flex flex-wrap", compact ? "gap-1" : "gap-2")}>
			{items.map((entry) => (
				<li key={entry.canonical} className="max-w-full">
					<PermissionPill entry={entry} compact={compact} />
				</li>
			))}
		</ul>
	);
};
