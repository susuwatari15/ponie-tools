import type { FC } from "react";
import type { PermissionEntry } from "../types";
import { getMethodPillClass } from "../_lib/permissionDisplay";

type PermissionPillProps = {
	entry: PermissionEntry;
};

export const PermissionPill: FC<PermissionPillProps> = ({ entry }) => {
	const method = entry.action || entry.type;
	return (
		<span
			className={`inline-flex rounded-full border px-3 py-1 font-mono text-xs ${getMethodPillClass(entry)}`}
			title={JSON.stringify(entry.raw, null, 2)}
		>
			[{method}] {entry.resource}
		</span>
	);
};
