import {
	Bookmark,
	CheckSquare,
	Copy,
	Download,
	Eraser,
	GitCompare,
	Link2,
	Square,
	Users,
} from "lucide-react";
import {
	type Command,
	type ShortcutEntry,
	useRegisterCommands,
} from "@/components/layout/CommandBar";
import { useToast } from "@/components/ui/ToastProvider";
import { useCopy } from "@/components/ui/useCopy";
import type { SwaggerMinifierController } from "./useSwaggerMinifier";

const GROUP = "Minifier";

/** Bound by the minifier's own components; listed here for the `?` cheat sheet. */
const MINIFIER_SHORTCUTS: ShortcutEntry[] = [
	{ keys: "mod+shift+f", label: "Focus the endpoint search", group: GROUP },
	{ keys: "up/down", label: "Move between endpoints in the list", group: GROUP },
	{ keys: "shift+up/down", label: "Extend the endpoint selection", group: GROUP },
	{ keys: "mod+a", label: "Select every visible endpoint (list focused)", group: GROUP },
	{ keys: "esc", label: "Clear the endpoint search (list focused)", group: GROUP },
	{ keys: "left/right", label: "Step through operations (brick view)", group: GROUP },
];

/** Registers the Swagger Minifier's command-bar actions while the page is mounted. */
export function useMinifierCommands(
	m: SwaggerMinifierController,
	{ onCompareLatest }: { onCompareLatest: () => void },
): void {
	const { toast } = useToast();
	const copyToClipboard = useCopy();

	const copy = (label: string, text: string) => {
		if (!text) {
			toast("Select endpoints first — there is nothing to copy yet.", "error");
			return;
		}
		void copyToClipboard(text, `${label} copied`);
	};

	const hasSpec = m.allEndpoints.length > 0;
	const commands: Command[] = [
		{
			id: "minifier:copy-minified",
			group: GROUP,
			label: "Copy minified JSON",
			hint: `${m.selectedCount} selected endpoint${m.selectedCount === 1 ? "" : "s"}, single line`,
			icon: Copy,
			shortcut: "mod+enter",
			run: () => copy("Minified JSON", m.minifiedCompact),
		},
		{
			id: "minifier:copy-formatted",
			group: GROUP,
			label: "Copy formatted JSON",
			hint: "The minified spec, pretty-printed",
			icon: Copy,
			run: () => copy("Formatted JSON", m.minifiedOutput),
		},
		{
			id: "minifier:share-link",
			group: GROUP,
			label: "Copy share link",
			hint: "Profile + selected endpoints as a /minifier link",
			icon: Link2,
			run: () => void copyToClipboard(m.buildShareLink(), "Share link copied"),
		},
		...(hasSpec
			? [
					{
						id: "minifier:toggle-visible",
						group: GROUP,
						label: m.visibleAllSelected ? "Deselect visible endpoints" : "Select visible endpoints",
						hint: `${m.filteredEndpoints.length} endpoint${m.filteredEndpoints.length === 1 ? "" : "s"} match the search`,
						icon: m.visibleAllSelected ? Square : CheckSquare,
						run: m.toggleSelectAllVisible,
					},
					{
						id: "minifier:clear-selection",
						group: GROUP,
						label: "Clear endpoint selection",
						icon: Square,
						run: () => m.setEndpointsSelected(Array.from(m.selectedIds), false),
					},
				]
			: []),
		{
			id: "minifier:clear-input",
			group: GROUP,
			label: "Clear input",
			hint: "Empty the spec text and start over",
			icon: Eraser,
			keywords: "reset paste",
			run: () => {
				m.setInputMode("manual");
				m.setRawJson("");
			},
		},
		...(m.selectedProfile?.url
			? [
					{
						id: "minifier:refetch",
						group: GROUP,
						label: `Reload ${m.selectedProfile.name} from URL`,
						hint: m.selectedProfile.url,
						icon: Download,
						keywords: "fetch refresh",
						run: () => void m.onFetchFromUrl(),
					},
				]
			: []),
		{
			id: "minifier:compare-latest",
			group: GROUP,
			label: "Compare the two latest snapshots",
			icon: GitCompare,
			keywords: "diff",
			run: onCompareLatest,
		},
		// Presets that match anything in the loaded spec.
		...m.presets
			.filter((preset) => (m.presetMatches.get(preset.id) ?? 0) > 0)
			.map<Command>((preset) => ({
				id: `minifier:preset:${preset.id}`,
				group: GROUP,
				label: `Apply preset: ${preset.name}`,
				hint: `${m.presetMatches.get(preset.id)}/${preset.endpointIds.length} endpoints in this spec · replaces the selection`,
				icon: Bookmark,
				keywords: "selection preset",
				run: () => {
					const { found, total } = m.applyPreset(preset, "replace");
					toast(`Applied “${preset.name}” — ${found}/${total} endpoints`, "success");
				},
			})),
		// Same ids as the shell's Profiles group, so these (fetch in place) win here.
		...m.profiles.map<Command>((profile) => ({
			id: `profile:${profile.id}`,
			group: "Profiles",
			label: `Fetch ${profile.name}`,
			hint: profile.url || "No Swagger URL set",
			icon: Users,
			keywords: "profile select load url",
			run: () => m.selectAndFetchProfile(profile.id),
		})),
	];

	useRegisterCommands(commands, MINIFIER_SHORTCUTS);
}
