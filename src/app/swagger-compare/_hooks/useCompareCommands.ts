import { Copy, FileDown, FilterX, GitCompare, Save, Square } from "lucide-react";
import {
	type Command,
	type ShortcutEntry,
	useRegisterCommands,
} from "@/components/layout/CommandBar";
import type { SideKey } from "../_lib/compareSources";
import type { SwaggerCompareController } from "./useSwaggerCompare";

const GROUP = "Compare";

/** Bound by the compare components; listed here for the `?` cheat sheet. */
const COMPARE_SHORTCUTS: ShortcutEntry[] = [
	{ keys: "esc", label: "Clear the result filter (filter focused)", group: GROUP },
	{ keys: "enter", label: "Save a snapshot rename", group: GROUP },
	{ keys: "esc", label: "Cancel a snapshot rename", group: GROUP },
];

/** Registers Swagger Compare's command-bar actions while the page is mounted. */
export function useCompareCommands(m: SwaggerCompareController): void {
	const hasResult = m.filteredResult !== null;
	const unsavedSides = (["a", "b"] as SideKey[]).filter((key) => {
		const side = m.resolved?.[key];
		return side !== undefined && side.kind !== "snapshot";
	});

	const commands: Command[] = [
		...(m.canCompare
			? [
					{
						id: "compare:run",
						group: GROUP,
						label: "Compare A → B",
						hint: "Run the diff with the current sources",
						icon: GitCompare,
						keywords: "diff run",
						run: () => void m.compare(),
					},
				]
			: []),
		...(m.canCopySelected
			? (["minified", "full"] as const).map<Command>((fmt) => ({
					id: `compare:copy-${fmt}`,
					group: GROUP,
					label: `Copy selected endpoints (${fmt})`,
					hint: `${m.selectedShownIds.length} endpoint${m.selectedShownIds.length === 1 ? "" : "s"} from B`,
					icon: Copy,
					run: () => void m.copySelected(fmt),
				}))
			: []),
		...(m.selectedIds.size > 0
			? [
					{
						id: "compare:clear-selection",
						group: GROUP,
						label: "Clear endpoint selection",
						icon: Square,
						run: m.clearSelection,
					},
				]
			: []),
		...(hasResult
			? [
					{
						id: "compare:export-copy-md",
						group: GROUP,
						label: "Copy diff as Markdown",
						hint: m.filtering ? "Filtered view" : "Whole diff",
						icon: Copy,
						keywords: "export",
						run: () => void m.exportDiff("copy-md"),
					},
					{
						id: "compare:export-md",
						group: GROUP,
						label: "Download diff as Markdown",
						icon: FileDown,
						keywords: "export",
						run: () => void m.exportDiff("download-md"),
					},
					{
						id: "compare:export-json",
						group: GROUP,
						label: "Download diff as JSON",
						icon: FileDown,
						keywords: "export",
						run: () => void m.exportDiff("download-json"),
					},
				]
			: []),
		...(m.filtering
			? [
					{
						id: "compare:reset-filters",
						group: GROUP,
						label: "Reset result filters",
						icon: FilterX,
						run: m.filterActions.reset,
					},
				]
			: []),
		...unsavedSides.map<Command>((key) => ({
			id: `compare:save-${key}`,
			group: GROUP,
			label: `Save side ${key.toUpperCase()} as snapshot`,
			hint: m.resolved?.[key].label,
			icon: Save,
			keywords: "snapshot store",
			run: () => void m.saveSideAsSnapshot(key),
		})),
	];

	useRegisterCommands(commands, COMPARE_SHORTCUTS);
}
