import { Copy } from "lucide-react";
import { type Command, useRegisterCommands } from "@/components/layout/CommandBar";
import type { UseEpochConverter } from "./useEpochConverter";

const GROUP = "Epoch Converter";

/** Registers the epoch converter's command-bar actions while the page is mounted. */
export function useEpochConverterCommands(m: UseEpochConverter): void {
	const commands: Command[] = [
		{
			id: "epoch:copy-now-seconds",
			group: GROUP,
			label: "Copy current epoch (seconds)",
			icon: Copy,
			keywords: "now timestamp unix",
			// Read the clock at run time; the live counter may lag a tick.
			run: () => m.copy(String(Math.floor(Date.now() / 1000))),
		},
		{
			id: "epoch:copy-now-millis",
			group: GROUP,
			label: "Copy current epoch (milliseconds)",
			icon: Copy,
			keywords: "now timestamp unix ms",
			run: () => m.copy(String(Date.now())),
		},
	];

	useRegisterCommands(commands);
}
