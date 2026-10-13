import type {
	CompressedSchema,
	HttpMethod,
	MinifiedOperation,
	MinifiedSwagger,
} from "@/types/openapi";
import { HTTP_METHOD_ORDER } from "@/components/ui/methodColors";

/** One operation from the minified spec, flattened for the visualizer. */
export type SpecOperation = {
	id: string;
	method: HttpMethod;
	path: string;
	op: MinifiedOperation;
	/** Key of the route node the operation hangs off. */
	nodeKey: string;
};

/** A node of the path-segment tree. Single-child chains are merged (`/api/v1`). */
export type SpecRouteNode = {
	key: string;
	label: string;
	depth: number;
	operations: SpecOperation[];
	children: SpecRouteNode[];
	parentKey: string | null;
	/** Operations in this node and every descendant. */
	totalOps: number;
	/** Distinct methods anywhere in the subtree. */
	methods: HttpMethod[];
};

export type LayoutNode = {
	node: SpecRouteNode;
	x: number;
	y: number;
	width: number;
	collapsed: boolean;
};

export type LayoutEdge = {
	from: LayoutNode;
	to: LayoutNode;
};

export type SpecLayout = {
	nodes: LayoutNode[];
	edges: LayoutEdge[];
	byKey: Map<string, LayoutNode>;
	width: number;
	height: number;
};

export const NODE_HEIGHT = 28;
const ROW_GAP = 10;
const COLUMN_GAP = 56;
const CHAR_WIDTH = 6.8;
const NODE_PADDING_X = 18;
export const PILL_WIDTH = 36;
const PILL_GAP = 3;
const TOGGLE_WIDTH = 30;

export const ROOT_KEY = "";

export const METHOD_SHORT_LABEL: Record<HttpMethod, string> = {
	get: "GET",
	post: "POST",
	put: "PUT",
	patch: "PATCH",
	delete: "DEL",
	options: "OPT",
	head: "HEAD",
	trace: "TRC",
};

export function parseMinifiedSpec(json: string): MinifiedSwagger | null {
	if (!json) return null;
	try {
		const parsed = JSON.parse(json) as MinifiedSwagger;
		return parsed && typeof parsed === "object" && parsed.paths ? parsed : null;
	} catch {
		return null;
	}
}

type TrieNode = {
	segment: string;
	prefix: string;
	operations: SpecOperation[];
	children: Map<string, TrieNode>;
};

const sortMethods = (methods: Iterable<HttpMethod>): HttpMethod[] =>
	HTTP_METHOD_ORDER.filter((method) => new Set(methods).has(method));

/** Build the route tree; `rootLabel` names the root node (usually the API title). */
export function buildRouteTree(spec: MinifiedSwagger, rootLabel: string): SpecRouteNode {
	const trie: TrieNode = { segment: "", prefix: ROOT_KEY, operations: [], children: new Map() };

	for (const [path, pathItem] of Object.entries(spec.paths)) {
		let cursor = trie;
		for (const segment of path.split("/").filter(Boolean)) {
			let child = cursor.children.get(segment);
			if (!child) {
				child = {
					segment,
					prefix: `${cursor.prefix}/${segment}`,
					operations: [],
					children: new Map(),
				};
				cursor.children.set(segment, child);
			}
			cursor = child;
		}
		for (const method of HTTP_METHOD_ORDER) {
			const op = pathItem[method];
			if (!op) continue;
			cursor.operations.push({
				id: `${method.toUpperCase()} ${path}`,
				method,
				path,
				op,
				nodeKey: "",
			});
		}
	}

	const convert = (
		trieNode: TrieNode,
		depth: number,
		parentKey: string | null,
		labelPrefix: string,
	): SpecRouteNode => {
		// Merge pass-through segments so `/api/v1/users` reads as one hop.
		if (parentKey !== null && trieNode.operations.length === 0 && trieNode.children.size === 1) {
			const [only] = trieNode.children.values();
			return convert(only, depth, parentKey, `${labelPrefix}/${trieNode.segment}`);
		}

		const key = trieNode.prefix;
		const node: SpecRouteNode = {
			key,
			label: parentKey === null ? rootLabel : `${labelPrefix}/${trieNode.segment}`,
			depth,
			operations: trieNode.operations.map((operation) => ({ ...operation, nodeKey: key })),
			children: [],
			parentKey,
			totalOps: 0,
			methods: [],
		};

		node.children = Array.from(trieNode.children.values())
			.sort((a, b) => a.segment.localeCompare(b.segment))
			.map((child) => convert(child, depth + 1, key, ""));

		node.totalOps =
			node.operations.length + node.children.reduce((sum, child) => sum + child.totalOps, 0);
		node.methods = sortMethods([
			...node.operations.map((operation) => operation.method),
			...node.children.flatMap((child) => child.methods),
		]);
		return node;
	};

	return convert(trie, 0, null, "");
}

export function flattenOperations(root: SpecRouteNode): SpecOperation[] {
	const result: SpecOperation[] = [];
	const walk = (node: SpecRouteNode) => {
		result.push(...node.operations);
		node.children.forEach(walk);
	};
	walk(root);
	return result;
}

export function collectRouteNodes(root: SpecRouteNode): Map<string, SpecRouteNode> {
	const map = new Map<string, SpecRouteNode>();
	const walk = (node: SpecRouteNode) => {
		map.set(node.key, node);
		node.children.forEach(walk);
	};
	walk(root);
	return map;
}

export function estimateNodeWidth(node: SpecRouteNode): number {
	const pills = node.operations.length;
	return Math.ceil(
		NODE_PADDING_X +
			node.label.length * CHAR_WIDTH +
			(pills > 0 ? 8 + pills * PILL_WIDTH + (pills - 1) * PILL_GAP : 0) +
			(node.children.length > 0 ? TOGGLE_WIDTH : 0),
	);
}

/** Left-to-right tidy tree: leaves take rows, parents center on their children. */
export function layoutRouteTree(root: SpecRouteNode, collapsed: Set<string>): SpecLayout {
	const columnWidths: number[] = [];
	const measure = (node: SpecRouteNode) => {
		columnWidths[node.depth] = Math.max(columnWidths[node.depth] ?? 0, estimateNodeWidth(node));
		if (!collapsed.has(node.key)) node.children.forEach(measure);
	};
	measure(root);

	const columnX: number[] = [];
	columnWidths.reduce((x, width, depth) => {
		columnX[depth] = x;
		return x + width + COLUMN_GAP;
	}, 0);

	const nodes: LayoutNode[] = [];
	const edges: LayoutEdge[] = [];
	const byKey = new Map<string, LayoutNode>();
	let row = 0;

	const place = (node: SpecRouteNode): LayoutNode => {
		const isCollapsed = collapsed.has(node.key) && node.children.length > 0;
		const layoutNode: LayoutNode = {
			node,
			x: columnX[node.depth] ?? 0,
			y: 0,
			width: estimateNodeWidth(node),
			collapsed: isCollapsed,
		};
		nodes.push(layoutNode);
		byKey.set(node.key, layoutNode);

		if (isCollapsed || node.children.length === 0) {
			layoutNode.y = row * (NODE_HEIGHT + ROW_GAP);
			row += 1;
			return layoutNode;
		}

		const children = node.children.map(place);
		layoutNode.y = (children[0].y + children[children.length - 1].y) / 2;
		for (const child of children) edges.push({ from: layoutNode, to: child });
		return layoutNode;
	};
	place(root);

	const width = nodes.reduce((max, n) => Math.max(max, n.x + n.width), 0);
	const height = Math.max(NODE_HEIGHT, row * (NODE_HEIGHT + ROW_GAP) - ROW_GAP);

	return { nodes, edges, byKey, width, height };
}

/** Human-readable type of a compressed schema, e.g. `User[]` or `map<string, int>`. */
export function schemaTypeLabel(schema: CompressedSchema | undefined): string {
	if (!schema) return "unknown";
	if (schema.$ref) return schema.$ref;
	if (schema.type === "array") return `${schemaTypeLabel(schema.items)}[]`;
	if (typeof schema.additionalProperties === "object" && !schema.properties) {
		return `map<string, ${schemaTypeLabel(schema.additionalProperties)}>`;
	}
	if (schema.properties) return "object";
	return schema.type ?? "any";
}

/** Fields shown beneath a schema row; arrays and maps expose their element's fields. */
export function schemaChildren(
	schema: CompressedSchema | undefined,
): Array<[string, CompressedSchema]> {
	if (!schema) return [];
	if (schema.type === "array") return schemaChildren(schema.items);
	if (schema.properties) return Object.entries(schema.properties);
	if (typeof schema.additionalProperties === "object") {
		const value = schema.additionalProperties;
		return value.properties ? Object.entries(value.properties) : [];
	}
	return [];
}

/** Count every leaf field in a schema — a rough "payload weight". */
export function countSchemaFields(schema: CompressedSchema | undefined, depth = 0): number {
	if (!schema || depth > 12) return 0;
	const children = schemaChildren(schema);
	if (children.length === 0) return 1;
	return children.reduce((sum, [, child]) => sum + countSchemaFields(child, depth + 1), 0);
}
