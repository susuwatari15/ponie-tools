import { useState } from "react";
import { useCopy } from "@/components/ui/useCopy";
import { SAMPLE_GROUP_1_JSON, SAMPLE_GROUP_2_JSON } from "../_constants/samples";
import { formatPermissionShortList, type PermissionCopyFormat } from "../_lib/formatPermissionShortList";
import { parseAndCompare } from "../_lib/parsePermissions";
import type { CompareResult, PermissionEntry, SectionId } from "../types";
import { usePermissionDiffCommands } from "./usePermissionDiffCommands";

export type AllGroupView = "group1" | "group2";

const initialOpenSections: Record<SectionId, boolean> = {
	only1: true,
	only2: true,
	common: true,
	all: true,
};

export function usePermissionDiff() {
	const copy = useCopy();
	const [group1RawJson, setGroup1RawJson] = useState("");
	const [group2RawJson, setGroup2RawJson] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<CompareResult | null>(null);
	const [allGroupView, setAllGroupView] = useState<AllGroupView>("group1");
	const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>(initialOpenSections);

	const summary =
		result === null
			? null
			: {
					group1: result.group1.allPermissions.length,
					group2: result.group2.allPermissions.length,
					common: result.common.length,
					only1: result.onlyInGroup1.length,
					only2: result.onlyInGroup2.length,
				};

	const allGroupItems =
		result === null
			? []
			: allGroupView === "group1"
				? result.group1.allPermissions
				: result.group2.allPermissions;

	const toggleSection = (id: SectionId) => {
		setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	const handleCompare = () => {
		setError(null);
		try {
			const next = parseAndCompare(group1RawJson, group2RawJson);
			setResult(next);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			setResult(null);
			setError(message);
		}
	};

	const handleCopyJson = async (
		_id: SectionId,
		items: PermissionEntry[],
		format: PermissionCopyFormat,
		moduleLabel: string
	) => {
		const payload =
			format === "full"
				? JSON.stringify(
						items.map((item) => item.raw),
						null,
						2
					)
				: formatPermissionShortList(moduleLabel, items);
		await copy(payload, format === "full" ? "Copied JSON" : "Copied short list");
	};

	const handleCopyText = async (
		_id: SectionId,
		items: PermissionEntry[],
		format: PermissionCopyFormat,
		moduleLabel: string
	) => {
		const payload =
			format === "full"
				? items.map((item) => `[${item.action || item.type}] ${item.resource}`).join("\n")
				: formatPermissionShortList(moduleLabel, items);
		await copy(payload, format === "full" ? "Copied text list" : "Copied short list");
	};

	const loadSample = () => {
		setGroup1RawJson(SAMPLE_GROUP_1_JSON);
		setGroup2RawJson(SAMPLE_GROUP_2_JSON);
		setError(null);
	};

	usePermissionDiffCommands({
		group1RawJson,
		group2RawJson,
		setGroup1RawJson,
		setGroup2RawJson,
		handleCompare,
		loadSample,
	});

	return {
		group1RawJson,
		setGroup1RawJson,
		group2RawJson,
		setGroup2RawJson,
		searchQuery,
		setSearchQuery,
		error,
		result,
		summary,
		allGroupItems,
		allGroupView,
		setAllGroupView,
		openSections,
		toggleSection,
		handleCompare,
		handleCopyJson,
		handleCopyText,
		loadSample,
	};
}
