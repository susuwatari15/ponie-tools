"use client";

import { Menu, PanelLeft, Search, Settings, WifiOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FC } from "react";
import { cn } from "@/components/ui/cn";
import { Kbd } from "@/components/ui/Kbd";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { useCommandBar } from "./CommandBar";
import { ExtensionStatusBadge } from "./ExtensionStatusBadge";
import { ThemeToggle } from "./ThemeToggle";
import { useSidebar } from "./SidebarProvider";

export const Header: FC = () => {
	const { toggleSidebar, collapsed, openMobile } = useSidebar();
	const { open: openCommandBar } = useCommandBar();
	const online = useOnlineStatus();
	const pathname = usePathname();

	return (
		<header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur">
			<div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
				{/* Mobile: open drawer */}
				<button
					type="button"
					onClick={openMobile}
					aria-label="Open menu"
					className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:text-fg lg:hidden"
				>
					<Menu className="h-5 w-5" />
				</button>

				{/* Desktop: collapse sidebar */}
				<button
					type="button"
					onClick={toggleSidebar}
					aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
					aria-pressed={!collapsed}
					title="Toggle sidebar (⌘/Ctrl + B)"
					className="hidden h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:text-fg lg:inline-flex"
				>
					<PanelLeft className="h-4 w-4" />
				</button>

				<Link href="/" className="flex items-center gap-2">
					<Image
						src="/android-chrome-192x192.png"
						alt="Ponie"
						width={28}
						height={28}
						priority
						className="h-7 w-7 rounded-md"
					/>
					<span className="font-mono text-sm font-semibold tracking-tight text-fg">
						ponie<span className="text-muted">/tools</span>
					</span>
				</Link>

				<div className="flex-1" />

				{online ? null : (
					<span
						role="status"
						title="You're offline — tools that need the network (URL fetches) won't work."
						className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300"
					>
						<WifiOff className="h-3.5 w-3.5" aria-hidden />
						<span className="hidden sm:inline">Offline</span>
					</span>
				)}

				<ExtensionStatusBadge />

				<button
					type="button"
					onClick={openCommandBar}
					className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-muted transition hover:border-muted/50 hover:text-fg"
				>
					<Search className="h-3.5 w-3.5" />
					<span className="hidden sm:inline">Search</span>
					<Kbd className="hidden sm:inline-flex">⌘K</Kbd>
				</button>

				<Link
					href="/settings"
					aria-label="Settings & data"
					title="Settings & data"
					aria-current={pathname === "/settings" ? "page" : undefined}
					className={cn(
						"inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-surface transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
						pathname === "/settings"
							? "border-accent/50 text-accent"
							: "border-line text-muted hover:border-muted/50 hover:text-fg",
					)}
				>
					<Settings className="h-4 w-4" />
				</Link>

				<ThemeToggle />
			</div>
			<div className="method-spectrum h-0.5 w-full opacity-80" aria-hidden />
		</header>
	);
};
