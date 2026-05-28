import { useState } from "react";
import { SAMPLE_GROUP_1_JSON, SAMPLE_GROUP_2_JSON } from "../_constants/samples";
import { copyText } from "../_lib/copyToClipboard";
import { formatPermissionShortList, type PermissionCopyFormat } from "../_lib/formatPermissionShortList";
import { parseAndCompare } from "../_lib/parsePermissions";
import type { CompareResult, PermissionEntry, SectionId } from "../types";

export type AllGroupView = "group1" | "group2";

const initialCopyStatus: Record<SectionId, string | null> = {
	only1: null,
	only2: null,
	common: null,
	all: null,
};

const initialOpenSections: Record<SectionId, boolean> = {
	only1: true,
	only2: true,
	common: true,
	all: true,
};

export function usePermissionDiff() {
	const [group1RawJson, setGroup1RawJson] = useState("");
	const [group2RawJson, setGroup2RawJson] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<CompareResult | null>(null);
	const [copyStatusMap, setCopyStatusMap] =
		useState<Record<SectionId, string | null>>(initialCopyStatus);
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
		setCopyStatusMap({ only1: null, only2: null, common: null, all: null });
		try {
			const next = parseAndCompare(group1RawJson, group2RawJson);
			setResult(next);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			setResult(null);
			setError(message);
		}
	};

	const setCopied = (id: SectionId, value: string) => {
		setCopyStatusMap((prev) => ({ ...prev, [id]: value }));
		window.setTimeout(() => {
			setCopyStatusMap((prev) => ({ ...prev, [id]: null }));
		}, 2000);
	};

	const handleCopyJson = async (
		id: SectionId,
		items: PermissionEntry[],
		format: PermissionCopyFormat,
		moduleLabel: string
	) => {
		try {
			const payload =
				format === "full"
					? JSON.stringify(
							items.map((item) => item.raw),
							null,
							2
						)
					: formatPermissionShortList(moduleLabel, items);
			await copyText(payload);
			setCopied(id, format === "full" ? "Copied JSON" : "Copied short list");
		} catch {
			setCopied(id, "Copy failed");
		}
	};

	const handleCopyText = async (
		id: SectionId,
		items: PermissionEntry[],
		format: PermissionCopyFormat,
		moduleLabel: string
	) => {
		try {
			const payload =
				format === "full"
					? items.map((item) => `[${item.action || item.type}] ${item.resource}`).join("\n")
					: formatPermissionShortList(moduleLabel, items);
			await copyText(payload);
			setCopied(id, format === "full" ? "Copied text list" : "Copied short list");
		} catch {
			setCopied(id, "Copy failed");
		}
	};

	const loadSample = () => {
		setGroup1RawJson(SAMPLE_GROUP_1_JSON);
		setGroup2RawJson(SAMPLE_GROUP_2_JSON);
		setError(null);
	};

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
		copyStatusMap,
		toggleSection,
		handleCompare,
		handleCopyJson,
		handleCopyText,
		loadSample,
	};
}
