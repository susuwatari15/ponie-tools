import { HTTP_METHOD_ORDER } from "@/components/ui/methodColors";
import type { HttpMethod } from "@/types/openapi";
import type { OpenApiCompareOk } from "@/lib/openApiCompare";
import { parseEndpointId } from "@/lib/swaggerMinifier";

export type CompareStatus = "added" | "removed" | "changed";

export type CompareCounts = Record<CompareStatus, number>;

export type CompareTreeLeaf = {
	kind: "leaf";
	key: string;
	endpointId: string;
	method: HttpMethod;
	path: string;
	summary: string;
	status: CompareStatus;
};

export type CompareTreeFolder = {
	kind: "folder";
	key: string;
	/** Segment label — single-child chains are merged into `a/b/c`. */
	label: string;
	children: CompareTreeNode[];
	counts: CompareCounts;
	total: number;
};

export type CompareTreeNode = CompareTreeFolder | CompareTreeLeaf;

export type CompareEntry = {
	endpointId: string;
	method: HttpMethod;
	path: string;
	summary: string;
	status: CompareStatus;
};

/** DOM id used to scroll a result row into view from the tree. */
export function endpointDomId(endpointId: string): string {
	return `cmp-ep-${endpointId.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}

const emptyCounts = (): CompareCounts => ({ added: 0, removed: 0, changed: 0 });

/** Flat list of every endpoint touched by the comparison. */
export function buildCompareEntries(result: OpenApiCompareOk): CompareEntry[] {
	const entries: CompareEntry[] = [];

	const push = (endpointId: string, summary: string, status: CompareStatus) => {
		const parsed = parseEndpointId(endpointId);
		if (!parsed) return;
		entries.push({
			endpointId,
			method: parsed.method,
			path: parsed.path,
			summary,
			status,
		});
	};

	for (const item of result.removed) push(item.id, item.summary, "removed");
	for (const item of result.added) push(item.id, item.summary, "added");
	for (const row of result.changed) {
		push(row.id, row.summaryB || row.summaryA, "changed");
	}

	return entries;
}

export function filterCompareEntries(
	entries: CompareEntry[],
	query: string,
): CompareEntry[] {
	const q = query.trim().toLowerCase();
	if (!q) return entries;
	return entries.filter(
		(e) =>
			e.path.toLowerCase().includes(q) ||
			e.method.includes(q) ||
			e.summary.toLowerCase().includes(q),
	);
}

type DraftFolder = {
	label: string;
	path: string;
	folders: Map<string, DraftFolder>;
	leaves: CompareEntry[];
};

const draftFolder = (label: string, path: string): DraftFolder => ({
	label,
	path,
	folders: new Map(),
	leaves: [],
});

const methodRank = (method: HttpMethod): number => {
	const index = HTTP_METHOD_ORDER.indexOf(method);
	return index === -1 ? HTTP_METHOD_ORDER.length : index;
};

function finalize(draft: DraftFolder): CompareTreeFolder {
	// Collapse single-child chains (`/api/v1/users` → one row) for compactness.
	let node = draft;
	let label = draft.label;
	while (node.leaves.length === 0 && node.folders.size === 1) {
		const [child] = Array.from(node.folders.values());
		label = `${label}/${child.label}`;
		node = child;
	}

	const children: CompareTreeNode[] = Array.from(node.folders.values())
		.sort((a, b) => a.label.localeCompare(b.label))
		.map(finalize);

	const leaves: CompareTreeLeaf[] = [...node.leaves]
		.sort((a, b) => methodRank(a.method) - methodRank(b.method))
		.map((entry) => ({
			kind: "leaf",
			key: entry.endpointId,
			endpointId: entry.endpointId,
			method: entry.method,
			path: entry.path,
			summary: entry.summary,
			status: entry.status,
		}));

	const counts = emptyCounts();
	let total = 0;

	for (const child of children) {
		if (child.kind === "folder") {
			counts.added += child.counts.added;
			counts.removed += child.counts.removed;
			counts.changed += child.counts.changed;
			total += child.total;
		}
	}
	for (const leaf of leaves) {
		counts[leaf.status] += 1;
		total += 1;
	}

	return {
		kind: "folder",
		key: node.path,
		label,
		children: [...children, ...leaves],
		counts,
		total,
	};
}

/** Path-segment tree of the compared endpoints, roots first. */
export function buildCompareTree(entries: CompareEntry[]): CompareTreeFolder[] {
	const root = draftFolder("", "");

	for (const entry of entries) {
		const segments = entry.path.split("/").filter(Boolean);
		let cursor = root;
		let cursorPath = "";
		for (const segment of segments) {
			cursorPath = `${cursorPath}/${segment}`;
			let next = cursor.folders.get(segment);
			if (!next) {
				next = draftFolder(segment, cursorPath);
				cursor.folders.set(segment, next);
			}
			cursor = next;
		}
		cursor.leaves.push(entry);
	}

	return Array.from(root.folders.values())
		.sort((a, b) => a.label.localeCompare(b.label))
		.map(finalize);
}

/** Folder keys to expand by default — everything for small diffs, roots otherwise. */
export function defaultExpandedKeys(
	roots: CompareTreeFolder[],
	leafBudget = 60,
): string[] {
	const totalLeaves = roots.reduce((sum, node) => sum + node.total, 0);
	const keys: string[] = [];

	const walk = (node: CompareTreeFolder, depth: number) => {
		if (totalLeaves > leafBudget && depth > 0) return;
		keys.push(node.key);
		for (const child of node.children) {
			if (child.kind === "folder") walk(child, depth + 1);
		}
	};

	for (const root of roots) walk(root, 0);
	return keys;
}

/** Every folder key in the tree. */
export function allFolderKeys(roots: CompareTreeFolder[]): string[] {
	const keys: string[] = [];
	const walk = (node: CompareTreeFolder) => {
		keys.push(node.key);
		for (const child of node.children) {
			if (child.kind === "folder") walk(child);
		}
	};
	for (const root of roots) walk(root);
	return keys;
}

/** Endpoint ids under `nodes` that exist in B and can therefore be copied. */
export function selectableEndpointIds(nodes: CompareTreeNode[]): string[] {
	const ids: string[] = [];
	const walk = (node: CompareTreeNode) => {
		if (node.kind === "leaf") {
			if (node.status !== "removed") ids.push(node.endpointId);
			return;
		}
		for (const child of node.children) walk(child);
	};
	for (const node of nodes) walk(node);
	return ids;
}
