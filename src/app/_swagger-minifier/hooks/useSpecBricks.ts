import { useMemo, useState } from "react";
import type { HttpMethod } from "@/types/openapi";
import {
	collectOperations,
	groupIntoPlates,
	parseMinifiedSpec,
	type SpecPlate,
} from "../lib/specBricks";

export type BrickSortMode = "path" | "size";

/** State for the brick (LEGO-style) view of the minified spec. */
export function useSpecBricks(minifiedOutput: string) {
	const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
	const [focusedMethods, setFocusedMethods] = useState<HttpMethod[]>([]);
	const [sortMode, setSortMode] = useState<BrickSortMode>("path");

	const spec = useMemo(() => parseMinifiedSpec(minifiedOutput), [minifiedOutput]);
	const operations = useMemo(() => (spec ? collectOperations(spec) : []), [spec]);

	const plates = useMemo<SpecPlate[]>(() => {
		const grouped = groupIntoPlates(operations);
		if (sortMode === "path") return grouped;
		return grouped
			.map((plate) => ({
				...plate,
				operations: [...plate.operations].sort((a, b) => b.studs - a.studs),
			}))
			.sort((a, b) => b.totalStuds - a.totalStuds);
	}, [operations, sortMode]);

	/** Operations in on-screen order, for stepping with ←/→. */
	const orderedOps = useMemo(() => plates.flatMap((plate) => plate.operations), [plates]);

	const methodCounts = useMemo(() => {
		const counts = new Map<HttpMethod, number>();
		for (const operation of operations) {
			counts.set(operation.method, (counts.get(operation.method) ?? 0) + 1);
		}
		return counts;
	}, [operations]);

	const totalStuds = operations.reduce((sum, operation) => sum + operation.studs, 0);

	// The selection disappears when the endpoint is deselected upstream.
	const selectedOp = orderedOps.find((operation) => operation.id === selectedOpId) ?? null;
	const selectedIndex = selectedOp ? orderedOps.indexOf(selectedOp) : -1;

	const selectOp = (id: string | null) => setSelectedOpId(id);

	const stepSelection = (delta: number) => {
		if (orderedOps.length === 0) return;
		const start = selectedIndex === -1 ? (delta > 0 ? -1 : 0) : selectedIndex;
		const next = (start + delta + orderedOps.length) % orderedOps.length;
		setSelectedOpId(orderedOps[next].id);
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
		operations: orderedOps,
		plates,
		methodCounts,
		totalStuds,
		sortMode,
		setSortMode,
		selectedOp,
		selectedIndex,
		selectOp,
		stepSelection,
		focusedMethods,
		toggleFocusedMethod,
		clearFocusedMethods: () => setFocusedMethods([]),
		isMethodFocused,
	};
}

export type SpecBricksController = ReturnType<typeof useSpecBricks>;
