import type { PermissionEntry } from "../types";

export type PermissionCopyFormat = "full" | "short";

export function formatPermissionShortList(moduleLabel: string, items: PermissionEntry[]): string {
	const lines = [`Module: ${moduleLabel}`, "Permissions:"];
	for (const item of items) {
		const token = item.action || item.type;
		lines.push(`  - [${token}] ${item.resource}`);
	}
	return lines.join("\n");
}
