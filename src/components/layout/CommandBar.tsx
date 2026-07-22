"use client";

import {
	ArrowRight,
	Moon,
	Search,
	Sun,
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
import { TOOL_NAV_ITEMS, HOME_NAV_ITEM } from "./constants/nav-items";
import { useTheme } from "./ThemeProvider";

type CommandBarContextValue = { open: () => void };
const CommandBarContext = createContext<CommandBarContextValue | null>(null);

type Command = {
	id: string;
	label: string;
	hint: string;
	icon: LucideIcon;
	run: () => void;
};

export const CommandBarProvider: FC<{ children: ReactNode }> = ({ children }) => {
	const router = useRouter();
	const { resolvedTheme, toggleTheme } = useTheme();
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	const open = useCallback(() => setIsOpen(true), []);
	const close = useCallback(() => {
		setIsOpen(false);
		setQuery("");
		setActive(0);
	}, []);

	const commands = useMemo<Command[]>(() => {
		const nav = [HOME_NAV_ITEM, ...TOOL_NAV_ITEMS].map((item) => ({
			id: `nav:${item.href}`,
			label: item.label,
			hint: item.description,
			icon: item.icon,
			run: () => router.push(item.href),
		}));
		return [
			...nav,
			{
				id: "theme",
				label: resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme",
				hint: "Toggle appearance",
				icon: resolvedTheme === "dark" ? Sun : Moon,
				run: toggleTheme,
			},
		];
	}, [router, resolvedTheme, toggleTheme]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return commands;
		return commands.filter(
			(c) =>
				c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q),
		);
	}, [commands, query]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setIsOpen((v) => !v);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	useEffect(() => {
		if (isOpen) {
			setActive(0);
			// Focus after the portal mounts.
			const id = window.setTimeout(() => inputRef.current?.focus(), 0);
			return () => window.clearTimeout(id);
		}
	}, [isOpen]);

	const runAt = useCallback(
		(index: number) => {
			const cmd = filtered[index];
			if (!cmd) return;
			cmd.run();
			close();
		},
		[filtered, close],
	);

	const value = useMemo(() => ({ open }), [open]);

	return (
		<CommandBarContext.Provider value={value}>
			{children}
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
												setActive((i) => Math.min(i + 1, filtered.length - 1));
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
										placeholder="Jump to a tool or run a command…"
										className="w-full bg-transparent py-3 text-sm text-fg outline-none placeholder:text-muted"
									/>
									<Kbd>Esc</Kbd>
								</div>
								<ul className="scroll-ide max-h-80 overflow-y-auto p-2">
									{filtered.length === 0 ? (
										<li className="px-3 py-6 text-center text-sm text-muted">
											No matching commands.
										</li>
									) : (
										filtered.map((cmd, i) => {
											const Icon = cmd.icon;
											return (
												<li key={cmd.id}>
													<button
														type="button"
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
																{cmd.label}
															</span>
															<span className="block truncate text-xs text-muted">
																{cmd.hint}
															</span>
														</span>
														{i === active ? (
															<ArrowRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
														) : null}
													</button>
												</li>
											);
										})
									)}
								</ul>
							</div>
						</div>,
						document.body,
					)
				: null}
		</CommandBarContext.Provider>
	);
};

export function useCommandBar(): CommandBarContextValue {
	const ctx = useContext(CommandBarContext);
	if (!ctx) throw new Error("useCommandBar must be used within CommandBarProvider");
	return ctx;
}
