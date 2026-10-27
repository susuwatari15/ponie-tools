import { ArrowLeftRight, Eraser, FlaskConical, GitCompare } from "lucide-react";
import { type Command, useRegisterCommands } from "@/components/layout/CommandBar";

const GROUP = "Permission Diff";

type PermissionDiffCommandsInput = {
	group1RawJson: string;
	group2RawJson: string;
	setGroup1RawJson: (value: string) => void;
	setGroup2RawJson: (value: string) => void;
	handleCompare: () => void;
	loadSample: () => void;
};

/** Registers Permission Diff's command-bar actions while the page is mounted. */
export function usePermissionDiffCommands(p: PermissionDiffCommandsInput): void {
	const hasInput = Boolean(p.group1RawJson.trim() || p.group2RawJson.trim());

	const commands: Command[] = [
		{
			id: "permission-diff:compare",
			group: GROUP,
			label: "Compare role groups",
			hint: "Diff group 1 against group 2",
			icon: GitCompare,
			run: p.handleCompare,
		},
		{
			id: "permission-diff:sample",
			group: GROUP,
			label: "Load sample data",
			icon: FlaskConical,
			keywords: "example demo",
			run: p.loadSample,
		},
		...(hasInput
			? [
					{
						id: "permission-diff:swap",
						group: GROUP,
						label: "Swap group 1 and group 2",
						icon: ArrowLeftRight,
						run: () => {
							p.setGroup1RawJson(p.group2RawJson);
							p.setGroup2RawJson(p.group1RawJson);
						},
					},
					{
						id: "permission-diff:clear",
						group: GROUP,
						label: "Clear both inputs",
						icon: Eraser,
						keywords: "reset",
						run: () => {
							p.setGroup1RawJson("");
							p.setGroup2RawJson("");
						},
					},
				]
			: []),
	];

	useRegisterCommands(commands);
}
