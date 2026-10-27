"use client";

import { format } from "date-fns";
import {
	ArrowRight,
	Clock,
	Keyboard,
	Layers,
	Moon,
	Rows3,
	Rows4,
	Search,
	Settings,
	Sun,
	Users,
	Zap,
	type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
	createContext,
	type FC,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui/cn";
import { Kbd } from "@/components/ui/Kbd";
import { listProfiles, type SwaggerProfile } from "@/lib/swaggerProfilesStorage";
import { listSnapshots, type SavedSnapshot } from "@/lib/swaggerSavedSnapshotsStorage";
import {
	formatShortcut,
	fuzzyScore,
	isTypingTarget,
	pushRecentCommandId,
	readRecentCommandIds,
} from "./commandBarUtils";
import { HOME_NAV_ITEM, TOOL_NAV_GROUPS } from "./constants/nav-items";
import { usePreferences } from "./PreferencesProvider";
import { type ShortcutSection, ShortcutsModal } from "./ShortcutsModal";
import { useTheme } from "./ThemeProvider";

export type Command = {
	/** Stable id — keys the recents list and de-duplicates (page commands win). */
	id: string;
	label: string;
	hint?: string;
	/** Section heading; page commands without one land under "This page". */
	group?: string;
	icon?: LucideIcon;
	/**
	 * Shortcut shown next to the command, e.g. `mod+enter` (see
	 * `formatShortcut`). Display only — the page binds the key itself.
	 */
	shortcut?: string;
	/** Extra words to match on, never shown. */
	keywords?: string;
	run: () => void;
};

/** A keyboard shortcut listed in the `?` cheat sheet. */
export type ShortcutEntry = {
	keys: string;
	label: string;
	group?: string;
};

type Registration = {
	commands: () => Command[];
	shortcuts: () => ShortcutEntry[];
};

type CommandBarContextValue = {
	open: () => void;
	openShortcuts: () => void;
	/** Adds a page's commands/shortcuts; returns the unregister function. */
	register: (registration: Registration) => () => void;
};

const CommandBarContext = createContext<CommandBarContextValue | null>(null);

const PAGE_GROUP = "This page";
const RECENT_GROUP = "Recent";
/** Rows per dynamic group (snapshots, profiles) before the user types. */
const DYNAMIC_PREVIEW = 5;

const GLOBAL_SHORTCUTS: ShortcutEntry[] = [
	{ keys: "mod+k", label: "Open the command bar" },
	{ keys: "mod+b", label: "Toggle the sidebar" },
	{ keys: "?", label: "Show keyboard shortcuts" },
	{ keys: "esc", label: "Close dialogs, menus and popovers" },
];

type Row = { key: string; section: string; command: Command };

type DynamicData = { snapshots: SavedSnapshot[]; profiles: SwaggerProfile[] };

/** Groups rows into sections; with a query, sections and rows are ordered by match score. */
function buildRows(commands: Command[], query: string, recentIds: string[]): Row[] {
	const q = query.trim();
	const sections = new Map<string, { best: number; rows: { score: number; command: Command }[] }>();
	const add = (section: string, command: Command, score: number) => {
		const entry = sections.get(section) ?? { best: -Infinity, rows: [] };
		entry.best = Math.max(entry.best, score);
		entry.rows.push({ score, command });
		sections.set(section, entry);
	};

	if (!q) {
		const byId = new Map(commands.map((command) => [command.id, command]));
		for (const id of recentIds) {
			const command = byId.get(id);
			if (command) add(RECENT_GROUP, command, 0);
		}
		const perGroup = new Map<string, number>();
		for (const command of commands) {
			const group = command.group ?? PAGE_GROUP;
			const count = perGroup.get(group) ?? 0;
			const isDynamic = group === "Snapshots" || group === "Profiles";
			if (isDynamic && count >= DYNAMIC_PREVIEW) continue;
			perGroup.set(group, count + 1);
			add(group, command, 0);
		}
	} else {
		for (const command of commands) {
			const labelScore = fuzzyScore(q, command.label);
			const otherScore = fuzzyScore(
				q,
				[command.group, command.hint, command.keywords].filter(Boolean).join(" "),
			);
			// Label matches always outrank matches on the hint / group / keywords.
			const score = labelScore !== null ? labelScore + 10_000 : otherScore;
			if (score !== null) add(command.group ?? PAGE_GROUP, command, score);
		}
	}

	const ordered = [...sections.entries()];
	if (q) ordered.sort((a, b) => b[1].best - a[1].best);
	return ordered.flatMap(([section, { rows }]) => {
		if (q) rows.sort((a, b) => b.score - a.score);
		return rows.map(({ command }) => ({ key: `${section}:${command.id}`, section, command }));
	});
}

export const CommandBarProvider: FC<{ children: ReactNode }> = ({ children }) => {
	const router = useRouter();
	const { resolvedTheme, toggleTheme } = useTheme();
	const { density, toggleDensity } = usePreferences();
	const [isOpen, setIsOpen] = useState(false);
	const [shortcutsOpen, setShortcutsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);
	const [recentIds, setRecentIds] = useState<string[]>([]);
	const [dynamic, setDynamic] = useState<DynamicData | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLUListElement>(null);

	const registrations = useRef(new Map<number, Registration>());
	const nextRegistrationId = useRef(1);
	/** Bumped on (un)registration so an open bar or cheat sheet picks it up. */
	const [registryVersion, setRegistryVersion] = useState(0);

	const register = useCallback((registration: Registration) => {
		const id = nextRegistrationId.current++;
		registrations.current.set(id, registration);
		setRegistryVersion((v) => v + 1);
		return () => {
			registrations.current.delete(id);
			setRegistryVersion((v) => v + 1);
		};
	}, []);

	const open = useCallback(() => setIsOpen(true), []);
	const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
	const close = useCallback(() => {
		setIsOpen(false);
		setQuery("");
		setActive(0);
	}, []);

	// Snapshots and profiles live in IndexedDB; read them only when the bar opens.
	useEffect(() => {
		if (!isOpen) return;
		setRecentIds(readRecentCommandIds());
		let alive = true;
		void Promise.all([listSnapshots(), listProfiles()]).then(([snapshots, profiles]) => {
			if (alive) setDynamic({ snapshots, profiles });
		});
		return () => {
			alive = false;
		};
	}, [isOpen]);

	const commands = useMemo<Command[]>(() => {
		if (!isOpen) return [];
		// Registrations live in a ref; `registryVersion` is what invalidates this.
		void registryVersion;
		const page = [...registrations.current.values()].flatMap((r) => r.commands());
		const nav = TOOL_NAV_GROUPS.flatMap((group) =>
			group.items.map<Command>((item) => ({
				id: `nav:${item.href}`,
				group: group.label,
				label: item.label,
				hint: item.description,
				icon: item.icon,
				keywords: "go open tool",
				run: () => router.push(item.href),
			})),
		);
		const snapshots = (dynamic?.snapshots ?? []).map<Command>((snap) => ({
			id: `snapshot:${snap.id}`,
			group: "Snapshots",
			label: snap.name,
			hint: `Compare from this snapshot · ${format(new Date(snap.createdAt), "yyyy-MM-dd HH:mm")}${
				snap.profileName ? ` · ${snap.profileName}` : ""
			}`,
			icon: Layers,
			keywords: "snapshot compare diff",
			run: () => router.push(`/swagger-compare?a=${encodeURIComponent(snap.id)}`),
		}));
		// The Minifier registers same-id commands that fetch in place while it is open.
		const profiles = (dynamic?.profiles ?? []).map<Command>((profile) => ({
			id: `profile:${profile.id}`,
			group: "Profiles",
			label: `Fetch ${profile.name}`,
			hint: profile.url || "No Swagger URL set",
			icon: Users,
			keywords: "profile select load url minifier",
			run: () => router.push(`/minifier?p=${encodeURIComponent(profile.id)}&fetch=1`),
		}));
		const app: Command[] = [
			{
				id: `nav:${HOME_NAV_ITEM.href}`,
				group: "App",
				label: HOME_NAV_ITEM.label,
				hint: HOME_NAV_ITEM.description,
				icon: HOME_NAV_ITEM.icon,
				run: () => router.push(HOME_NAV_ITEM.href),
			},
			{
				id: "nav:/settings",
				group: "App",
				label: "Settings & data",
				hint: "Backup, restore or clear local data",
				icon: Settings,
				keywords: "backup restore export import storage clear",
				run: () => router.push("/settings"),
			},
			{
				id: "app:shortcuts",
				group: "App",
				label: "Keyboard shortcuts",
				hint: "Show every shortcut",
				icon: Keyboard,
				shortcut: "?",
				keywords: "help keys cheat sheet",
				run: openShortcuts,
			},
			{
				id: "app:theme",
				group: "App",
				label: resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme",
				hint: "Toggle appearance",
				icon: resolvedTheme === "dark" ? Sun : Moon,
				keywords: "theme dark light mode",
				run: toggleTheme,
			},
			{
				// The sidebar footer toggle is out of reach while the sidebar is collapsed.
				id: "app:density",
				group: "App",
				label: density === "compact" ? "Use comfortable density" : "Use compact density",
				hint: "Spacing and font size in long lists",
				icon: density === "compact" ? Rows3 : Rows4,
				keywords: "density compact comfortable spacing dense",
				run: toggleDensity,
			},
		];
		const seen = new Set<string>();
		return [...page, ...nav, ...snapshots, ...profiles, ...app].filter((command) => {
			if (seen.has(command.id)) return false;
			seen.add(command.id);
			return true;
		});
	}, [
		isOpen,
		registryVersion,
		dynamic,
		router,
		resolvedTheme,
		toggleTheme,
		density,
		toggleDensity,
		openShortcuts,
	]);

	const rows = useMemo(() => buildRows(commands, query, recentIds), [commands, query, recentIds]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setIsOpen((v) => !v);
				return;
			}
			if (
				e.key === "?" &&
				!e.metaKey &&
				!e.ctrlKey &&
				!e.altKey &&
				!e.defaultPrevented &&
				!isTypingTarget(e.target)
			) {
				e.preventDefault();
				setShortcutsOpen((v) => !v);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	useEffect(() => {
		if (isOpen) {
			setActive(0);
			setShortcutsOpen(false);
			// Focus after the portal mounts.
			const id = window.setTimeout(() => inputRef.current?.focus(), 0);
			return () => window.clearTimeout(id);
		}
	}, [isOpen]);

	// Keep the highlighted row in view while arrowing through a long list.
	useEffect(() => {
		listRef.current
			?.querySelector<HTMLElement>(`[data-row-index="${active}"]`)
			?.scrollIntoView({ block: "nearest" });
	}, [active]);

	const runAt = useCallback(
		(index: number) => {
			const row = rows[index];
			if (!row) return;
			pushRecentCommandId(row.command.id);
			close();
			row.command.run();
		},
		[rows, close],
	);

	const shortcutSections = useMemo<ShortcutSection[]>(() => {
		if (!shortcutsOpen) return [];
		void registryVersion;
		const sections = new Map<string, ShortcutEntry[]>();
		const seen = new Set<string>();
		const add = (group: string, entry: ShortcutEntry) => {
			const id = `${entry.keys}|${entry.label}`;
			if (seen.has(id)) return;
			seen.add(id);
			sections.set(group, [...(sections.get(group) ?? []), entry]);
		};
		for (const entry of GLOBAL_SHORTCUTS) add("Global", entry);
		for (const registration of registrations.current.values()) {
			for (const entry of registration.shortcuts()) add(entry.group ?? PAGE_GROUP, entry);
			for (const command of registration.commands()) {
				if (command.shortcut) {
					add(command.group ?? PAGE_GROUP, { keys: command.shortcut, label: command.label });
				}
			}
		}
		return [...sections.entries()].map(([title, entries]) => ({ title, entries }));
	}, [shortcutsOpen, registryVersion]);

	const value = useMemo(() => ({ open, openShortcuts, register }), [open, openShortcuts, register]);

	return (
		<CommandBarContext.Provider value={value}>
			{children}
			<ShortcutsModal
				open={shortcutsOpen}
				onClose={() => setShortcutsOpen(false)}
				sections={shortcutSections}
			/>
			{isOpen && typeof document !== "undefined"
				? createPortal(
						<div
							className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/70 p-4 pt-[12vh] backdrop-blur-sm"
							role="dialog"
							aria-modal="true"
							aria-label="Command menu"
							onMouseDown={(e) => {
								if (e.target === e.currentTarget) close();
							}}
						>
							<div className="w-full max-w-lg overflow-hidden rounded-card border border-line bg-surface shadow-glow">
								<div className="flex items-center gap-2 border-b border-line px-3">
									<Search className="h-4 w-4 shrink-0 text-muted" />
									<input
										ref={inputRef}
										value={query}
										onChange={(e) => {
											setQuery(e.target.value);
											setActive(0);
										}}
										onKeyDown={(e) => {
											if (e.key === "ArrowDown") {
												e.preventDefault();
												setActive((i) => Math.min(i + 1, rows.length - 1));
											} else if (e.key === "ArrowUp") {
												e.preventDefault();
												setActive((i) => Math.max(i - 1, 0));
											} else if (e.key === "Enter") {
												e.preventDefault();
												runAt(active);
											} else if (e.key === "Escape") {
												e.preventDefault();
												close();
											}
										}}
										placeholder="Jump to a tool, snapshot or profile, or run a command…"
										aria-label="Search commands"
										className="w-full bg-transparent py-3 text-sm text-fg outline-none placeholder:text-muted"
									/>
									<Kbd>Esc</Kbd>
								</div>
								<ul ref={listRef} className="scroll-ide max-h-96 overflow-y-auto p-2">
									{rows.length === 0 ? (
										<li className="px-3 py-6 text-center text-sm text-muted">
											No matching commands.
										</li>
									) : (
										rows.map((row, i) => {
											const { command } = row;
											const Icon = row.section === RECENT_GROUP ? Clock : (command.icon ?? Zap);
											const showHeader = i === 0 || rows[i - 1].section !== row.section;
											return (
												<li key={row.key}>
													{showHeader ? (
														<p
															className={cn(
																"px-3 pb-1 font-mono text-[10px] uppercase tracking-widest text-muted",
																i === 0 ? "pt-1" : "pt-3",
															)}
														>
															{row.section}
														</p>
													) : null}
													<button
														type="button"
														data-row-index={i}
														onMouseEnter={() => setActive(i)}
														onClick={() => runAt(i)}
														className={cn(
															"flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition",
															i === active ? "bg-accent/12 text-accent" : "text-fg hover:bg-raised",
														)}
													>
														<Icon className="h-4 w-4 shrink-0" aria-hidden />
														<span className="min-w-0 flex-1">
															<span className="block truncate text-sm font-medium">
																{command.label}
															</span>
															{command.hint ? (
																<span className="block truncate text-xs text-muted">
																	{command.hint}
																</span>
															) : null}
														</span>
														{command.shortcut ? (
															<span className="flex shrink-0 items-center gap-1">
																{formatShortcut(command.shortcut).map((key) => (
																	<Kbd key={key}>{key}</Kbd>
																))}
															</span>
														) : i === active ? (
															<ArrowRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
														) : null}
													</button>
												</li>
											);
										})
									)}
								</ul>
								<div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-3 py-2 text-[11px] text-muted">
									<span className="inline-flex items-center gap-1">
										<Kbd>↑</Kbd>
										<Kbd>↓</Kbd>
										navigate
									</span>
									<span className="inline-flex items-center gap-1">
										<Kbd>↵</Kbd>
										run
									</span>
									<span className="inline-flex items-center gap-1">
										<Kbd>?</Kbd>
										all shortcuts
									</span>
								</div>
							</div>
						</div>,
						document.body,
					)
				: null}
		</CommandBarContext.Provider>
	);
};

export function useCommandBar(): Pick<CommandBarContextValue, "open" | "openShortcuts"> {
	const ctx = useContext(CommandBarContext);
	if (!ctx) throw new Error("useCommandBar must be used within CommandBarProvider");
	return ctx;
}

/**
 * Registers page commands (shown in the command bar) and cheat-sheet shortcuts
 * while the calling component is mounted. Both lists are read fresh each time
 * the bar or cheat sheet opens, so callers can pass new arrays every render.
 */
export function useRegisterCommands(commands: Command[], shortcuts: ShortcutEntry[] = []): void {
	const register = useContext(CommandBarContext)?.register;
	const latest = useRef({ commands, shortcuts });

	useEffect(() => {
		latest.current = { commands, shortcuts };
	});

	useEffect(() => {
		if (!register) return;
		return register({
			commands: () => latest.current.commands,
			shortcuts: () => latest.current.shortcuts,
		});
	}, [register]);
}
