import { idbGet, idbPut, KEYVAL_STORE, LAST_TOOL_KEY } from "./indexedDb";

/** The tool page the user was last on, for Home's "Continue where you left off". */
export type LastVisitedTool = {
	href: string;
	visitedAt: string;
};

export async function readLastVisitedTool(): Promise<LastVisitedTool | null> {
	try {
		const stored = await idbGet<unknown>(KEYVAL_STORE, LAST_TOOL_KEY);
		if (
			stored &&
			typeof stored === "object" &&
			typeof (stored as LastVisitedTool).href === "string" &&
			typeof (stored as LastVisitedTool).visitedAt === "string"
		) {
			return stored as LastVisitedTool;
		}
		return null;
	} catch {
		return null;
	}
}

export async function writeLastVisitedTool(href: string): Promise<void> {
	try {
		await idbPut(
			KEYVAL_STORE,
			{ href, visitedAt: new Date().toISOString() } satisfies LastVisitedTool,
			LAST_TOOL_KEY,
		);
	} catch {
		// storage unavailable
	}
}
