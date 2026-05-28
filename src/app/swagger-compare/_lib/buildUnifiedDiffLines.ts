import { diffLines } from "diff";

export type UnifiedDiffLineKind = "remove" | "add" | "context";

export type UnifiedDiffLine = {
	kind: UnifiedDiffLineKind;
	prefix: "-" | "+" | " ";
	text: string;
};

function chunkToLines(value: string): string[] {
	if (value === "") return [];
	const normalized = value.endsWith("\n") ? value.slice(0, -1) : value;
	return normalized.split("\n");
}

/**
 * Line-level unified diff for git-style display (prefix − / + / space).
 */
export function buildUnifiedDiffLines(oldText: string, newText: string): UnifiedDiffLine[] {
	const parts = diffLines(oldText, newText);
	const rows: UnifiedDiffLine[] = [];

	for (const part of parts) {
		const lines = chunkToLines(part.value);
		for (const line of lines) {
			if (part.added) {
				rows.push({ kind: "add", prefix: "+", text: line });
			} else if (part.removed) {
				rows.push({ kind: "remove", prefix: "-", text: line });
			} else {
				rows.push({ kind: "context", prefix: " ", text: line });
			}
		}
	}

	return rows;
}
