import { Braces, Copy, Eraser, ListTree, Minimize2 } from "lucide-react";
import { type Command, useRegisterCommands } from "@/components/layout/CommandBar";
import type { UseJsonFormatter, ViewMode } from "./useJsonFormatter";

const GROUP = "JSON Formatter";

const MODES: { mode: ViewMode; label: string; icon: Command["icon"] }[] = [
	{ mode: "beautify", label: "Show beautified JSON", icon: Braces },
	{ mode: "tree", label: "Show JSON tree", icon: ListTree },
	{ mode: "minify", label: "Show minified JSON", icon: Minimize2 },
];

/** Registers the JSON formatter's command-bar actions while the page is mounted. */
export function useJsonFormatterCommands(m: UseJsonFormatter): void {
	const commands: Command[] = [
		...(m.isEmpty || m.error
			? []
			: [
					{
						id: "json-formatter:copy",
						group: GROUP,
						label: m.mode === "minify" ? "Copy minified JSON" : "Copy formatted JSON",
						icon: Copy,
						run: m.copy,
					},
				]),
		...MODES.filter(({ mode }) => mode !== m.mode).map<Command>(({ mode, label, icon }) => ({
			id: `json-formatter:mode-${mode}`,
			group: GROUP,
			label,
			icon,
			keywords: "view mode",
			run: () => m.setMode(mode),
		})),
		...(m.isEmpty
			? []
			: [
					{
						id: "json-formatter:clear",
						group: GROUP,
						label: "Clear input",
						icon: Eraser,
						keywords: "reset",
						run: m.clear,
					},
				]),
	];

	useRegisterCommands(commands);
}
