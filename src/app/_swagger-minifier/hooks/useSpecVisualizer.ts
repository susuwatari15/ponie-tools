import { useMemo, useState } from "react";
import type { HttpMethod } from "@/types/openapi";
import {
	buildRouteTree,
	collectRouteNodes,
	flattenOperations,
	layoutRouteTree,
	parseMinifiedSpec,
	type SpecRouteNode,
} from "../lib/specMap";

/** State for the visual (route map + inspector) view of the minified spec. */
export function useSpecVisualizer(minifiedOutput: string) {
	const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
	const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
	const [hoveredKey, setHoveredKey] = useState<string | null>(null);
	const [focusedMethods, setFocusedMethods] = useState<HttpMethod[]>([]);
	/** Bumped by bulk expand/collapse so the canvas knows to re-fit. */
	const [fitToken, setFitToken] = useState(0);

	const spec = useMemo(() => parseMinifiedSpec(minifiedOutput), [minifiedOutput]);

	const root = useMemo(() => {
		if (!spec) return null;
		const title = spec.info?.title?.trim() || "API";
		return buildRouteTree(spec, title);
	}, [spec]);

	const nodesByKey = useMemo(() => (root ? collectRouteNodes(root) : new Map<string, SpecRouteNode>()), [root]);
	const operations = useMemo(() => (root ? flattenOperations(root) : []), [root]);

	const layout = useMemo(
		() => (root ? layoutRouteTree(root, collapsed) : null),
		[root, collapsed],
	);

	// The selection may disappear when the endpoint is deselected upstream.
	const selectedOp = operations.find((operation) => operation.id === selectedOpId) ?? null;
	const selectedIndex = selectedOp ? operations.indexOf(selectedOp) : -1;

	const methodCounts = useMemo(() => {
		const counts = new Map<HttpMethod, number>();
		for (const operation of operations) {
			counts.set(operation.method, (counts.get(operation.method) ?? 0) + 1);
		}
		return counts;
	}, [operations]);

	/** Keys from `key` up to the root — used to light up a route trail. */
	const ancestorsOf = (key: string | null): Set<string> => {
		const trail = new Set<string>();
		let cursor = key === null ? undefined : nodesByKey.get(key);
		while (cursor) {
			trail.add(cursor.key);
			cursor = cursor.parentKey === null ? undefined : nodesByKey.get(cursor.parentKey);
		}
		return trail;
	};

	const selectedTrail = ancestorsOf(selectedOp?.nodeKey ?? null);
	const hoverTrail = ancestorsOf(hoveredKey);

	const toggleCollapsed = (key: string) => {
		setCollapsed((previous) => {
			const next = new Set(previous);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const expandAll = () => {
		setCollapsed(new Set());
		setFitToken((token) => token + 1);
	};

	/**
	 * Collapse at the first level that fans out (3+ routes) — usually the
	 * resource level, e.g. `/users`, `/orders` — so shared prefixes stay open.
	 */
	const collapseAll = () => {
		if (!root) return;
		let level = root.children;
		while (level.length > 0 && level.length < 3) {
			const nextLevel = level.flatMap((node) => node.children);
			if (nextLevel.length === 0) break;
			level = nextLevel;
		}
		const next = new Set<string>();
		for (const node of level) {
			if (node.children.length > 0) next.add(node.key);
		}
		setCollapsed(next);
		setFitToken((token) => token + 1);
	};

	/** Select an operation and make sure its node is not hidden in a collapsed branch. */
	const selectOp = (id: string | null) => {
		setSelectedOpId(id);
		const target = operations.find((operation) => operation.id === id);
		if (!target) return;
		const trail = ancestorsOf(target.nodeKey);
		setCollapsed((previous) => {
			if (![...previous].some((key) => trail.has(key) && key !== target.nodeKey)) return previous;
			const next = new Set(previous);
			for (const key of trail) if (key !== target.nodeKey) next.delete(key);
			return next;
		});
	};

	const stepSelection = (delta: number) => {
		if (operations.length === 0) return;
		const start = selectedIndex === -1 ? (delta > 0 ? -1 : 0) : selectedIndex;
		const next = (start + delta + operations.length) % operations.length;
		selectOp(operations[next].id);
	};

	const toggleFocusedMethod = (method: HttpMethod) => {
		setFocusedMethods((previous) =>
			previous.includes(method)
				? previous.filter((m) => m !== method)
				: [...previous, method],
		);
	};

	const isMethodFocused = (method: HttpMethod) =>
		focusedMethods.length === 0 || focusedMethods.includes(method);

	return {
		spec,
		root,
		layout,
		operations,
		methodCounts,
		collapsed,
		fitToken,
		toggleCollapsed,
		expandAll,
		collapseAll,
		selectedOp,
		selectedIndex,
		selectOp,
		stepSelection,
		hoveredKey,
		setHoveredKey,
		selectedTrail,
		hoverTrail,
		focusedMethods,
		toggleFocusedMethod,
		clearFocusedMethods: () => setFocusedMethods([]),
		isMethodFocused,
	};
}

export type SpecVisualizerController = ReturnType<typeof useSpecVisualizer>;
