import { useEffect, useMemo, useState } from "react";
import type { OpenApiCompareResult } from "@/lib/openApiCompare";
import { endpointDomId, schemaDomId } from "../_lib/compareTree";

export type ResultSection = "removed" | "added" | "schemas" | "changed";

/** Rows mounted per section at a time, so a huge diff doesn't render every row up front. */
export const RESULTS_PAGE_SIZE = 100;

/** The slice of a section's rows that is rendered: `[start, end)`. */
export type RowWindow = { start: number; end: number };

/** A section with at most this many diffs starts expanded; larger ones start collapsed. */
const AUTO_EXPAND_LIMIT = 10;

/** Ask the results to scroll to an endpoint. `seq` lets the same endpoint be requested twice. */
export type FocusRequest = { endpointId: string; seq: number };

export const endpointKey = (endpointId: string): string => `ep:${endpointId}`;
export const schemaKey = (schemaName: string): string => `schema:${schemaName}`;

type RowLocation = { section: ResultSection; index: number; domId: string };

const FIRST_PAGE: RowWindow = { start: 0, end: RESULTS_PAGE_SIZE };

const INITIAL_WINDOWS: Record<ResultSection, RowWindow> = {
	removed: FIRST_PAGE,
	added: FIRST_PAGE,
	schemas: FIRST_PAGE,
	changed: FIRST_PAGE,
};

/** Keys of the rows in a section that have a diff to expand. */
export function expandableKeys(
	result: OpenApiCompareResult | null,
	section: "schemas" | "changed",
): string[] {
	if (!result?.ok) return [];
	return section === "schemas"
		? result.changedSchemas.map((schema) => schemaKey(schema.name))
		: result.changed.filter((row) => row.ownChanged).map((row) => endpointKey(row.id));
}

function initialExpanded(result: OpenApiCompareResult | null): Set<string> {
	const keys = new Set<string>();
	for (const section of ["schemas", "changed"] as const) {
		const sectionKeys = expandableKeys(result, section);
		if (sectionKeys.length > AUTO_EXPAND_LIMIT) continue;
		for (const key of sectionKeys) keys.add(key);
	}
	return keys;
}

export function useCompareResultsView(
	result: OpenApiCompareResult | null,
	focusRequest: FocusRequest | null,
) {
	const [prevResult, setPrevResult] = useState(result);
	const [prevFocus, setPrevFocus] = useState(focusRequest);
	const [windows, setWindows] = useState(INITIAL_WINDOWS);
	const [expanded, setExpanded] = useState(() => initialExpanded(result));
	const [focusedKey, setFocusedKey] = useState<string | null>(null);
	const [scrollTarget, setScrollTarget] = useState<{ domId: string } | null>(null);

	const locations = useMemo(() => {
		const map = new Map<string, RowLocation>();
		if (!result?.ok) return map;
		const addEndpoints = (section: ResultSection, ids: string[]) =>
			ids.forEach((id, index) =>
				map.set(endpointKey(id), { section, index, domId: endpointDomId(id) }),
			);
		addEndpoints("removed", result.removed.map((item) => item.id));
		addEndpoints("added", result.added.map((item) => item.id));
		addEndpoints("changed", result.changed.map((row) => row.id));
		result.changedSchemas.forEach((schema, index) =>
			map.set(schemaKey(schema.name), {
				section: "schemas",
				index,
				domId: schemaDomId(schema.name),
			}),
		);
		return map;
	}, [result]);

	/**
	 * Brings the row into its section's window (jumping to the page that holds
	 * it, rather than mounting every row before it), expands and highlights it,
	 * then scrolls to it.
	 */
	const reveal = (key: string) => {
		const location = locations.get(key);
		if (!location) return;
		setWindows((prev) => {
			const current = prev[location.section];
			if (location.index >= current.start && location.index < current.end) return prev;
			const start = Math.floor(location.index / RESULTS_PAGE_SIZE) * RESULTS_PAGE_SIZE;
			return { ...prev, [location.section]: { start, end: start + RESULTS_PAGE_SIZE } };
		});
		setExpanded((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
		setFocusedKey(key);
		setScrollTarget({ domId: location.domId });
	};

	// A new comparison starts from a clean view.
	if (result !== prevResult) {
		setPrevResult(result);
		setWindows(INITIAL_WINDOWS);
		setExpanded(initialExpanded(result));
		setFocusedKey(null);
	}

	if (focusRequest !== prevFocus) {
		setPrevFocus(focusRequest);
		if (focusRequest) reveal(endpointKey(focusRequest.endpointId));
	}

	// Scroll once the revealed row has actually been rendered.
	useEffect(() => {
		if (!scrollTarget) return;
		document
			.getElementById(scrollTarget.domId)
			?.scrollIntoView({ behavior: "smooth", block: "center" });
	}, [scrollTarget]);

	const setKeysExpanded = (keys: string[], open: boolean) =>
		setExpanded((prev) => {
			const next = new Set(prev);
			for (const key of keys) {
				if (open) next.add(key);
				else next.delete(key);
			}
			return next;
		});

	const updateWindow = (section: ResultSection, update: (current: RowWindow) => RowWindow) =>
		setWindows((prev) => ({ ...prev, [section]: update(prev[section]) }));

	return {
		rowWindow: (section: ResultSection) => windows[section],
		showNext: (section: ResultSection) =>
			updateWindow(section, (current) => ({ ...current, end: current.end + RESULTS_PAGE_SIZE })),
		showPrevious: (section: ResultSection) =>
			updateWindow(section, (current) => ({
				...current,
				start: Math.max(0, current.start - RESULTS_PAGE_SIZE),
			})),
		showAll: (section: ResultSection) =>
			updateWindow(section, () => ({ start: 0, end: Number.POSITIVE_INFINITY })),
		isExpanded: (key: string) => expanded.has(key),
		toggleExpanded: (key: string) => setKeysExpanded([key], !expanded.has(key)),
		setKeysExpanded,
		isFocused: (key: string) => focusedKey === key,
		reveal,
	};
}

export type CompareResultsView = ReturnType<typeof useCompareResultsView>;
