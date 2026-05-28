import type { PermissionEntry } from "../types";

export function matchesSearch(entry: PermissionEntry, query: string): boolean {
	if (!query) return true;
	const q = query.toLowerCase();
	const printable = `[${entry.action || entry.type}] ${entry.resource}`.toLowerCase();
	const full = JSON.stringify(entry.raw).toLowerCase();
	return printable.includes(q) || full.includes(q);
}

export function getMethodPillClass(entry: PermissionEntry): string {
	const token = entry.action.toUpperCase();
	if (token === "GET")
		return "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/70 dark:bg-blue-950/60 dark:text-blue-200";
	if (token === "POST")
		return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/70 dark:bg-emerald-950/50 dark:text-emerald-200";
	if (token === "PUT" || token === "PATCH")
		return "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/70 dark:bg-amber-950/50 dark:text-amber-200";
	if (token === "DELETE")
		return "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/70 dark:bg-rose-950/50 dark:text-rose-200";

	return "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-500/70 dark:bg-violet-950/50 dark:text-violet-200";
}
