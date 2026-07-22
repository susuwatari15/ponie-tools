"use client";

import { X } from "lucide-react";
import type { FC } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { WORKSPACE_NAV_ITEMS } from "./constants/nav-items";
import { navClassName } from "./nav-styles";
import { useSidebar } from "./SidebarProvider";

const NavItems: FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
	const pathname = usePathname();
	return (
		<nav className="flex flex-col gap-1 p-3" aria-label="Main">
			{WORKSPACE_NAV_ITEMS.map(({ href, end, label, description, icon: Icon }) => {
				const isActive = end ? pathname === href : pathname.startsWith(href);
				return (
					<Link
						key={href}
						href={href}
						aria-current={isActive ? "page" : undefined}
						onClick={onNavigate}
						className={navClassName({ isActive })}
					>
						<Icon className="size-[1.125rem] shrink-0" aria-hidden />
						<span className="min-w-0">
							<span className="block truncate">{label}</span>
							<span
								className={cn(
									"block truncate text-[11px] font-normal",
									isActive ? "text-accent/70" : "text-muted/70",
								)}
							>
								{description}
							</span>
						</span>
					</Link>
				);
			})}
		</nav>
	);
};

export const Sidebar: FC = () => {
	const { collapsed, mobileOpen, closeMobile } = useSidebar();

	return (
		<>
			{/* Desktop column */}
			<aside
				className={cn(
					"w-64 shrink-0 border-r border-line bg-surface/60 backdrop-blur",
					collapsed ? "hidden" : "hidden lg:block",
				)}
			>
				<div className="sticky top-0">
					<NavItems />
				</div>
			</aside>

			{/* Mobile slide-over drawer */}
			<div
				className={cn(
					"fixed inset-0 z-40 lg:hidden",
					mobileOpen ? "" : "pointer-events-none",
				)}
				aria-hidden={!mobileOpen}
			>
				<div
					className={cn(
						"absolute inset-0 bg-ink/70 backdrop-blur-sm transition-opacity",
						mobileOpen ? "opacity-100" : "opacity-0",
					)}
					onClick={closeMobile}
				/>
				<aside
					className={cn(
						"absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col border-r border-line bg-surface shadow-glow transition-transform duration-200",
						mobileOpen ? "translate-x-0" : "-translate-x-full",
					)}
				>
					<div className="flex items-center justify-between border-b border-line px-4 py-3">
						<span className="font-mono text-sm font-semibold text-fg">ponie</span>
						<button
							type="button"
							onClick={closeMobile}
							aria-label="Close menu"
							className="text-muted transition hover:text-fg"
						>
							<X className="h-5 w-5" />
						</button>
					</div>
					<NavItems onNavigate={closeMobile} />
				</aside>
			</div>
		</>
	);
};
