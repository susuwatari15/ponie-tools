"use client";

import { X } from "lucide-react";
import { type FC, useId } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { HOME_NAV_ITEM, type NavGroup, type NavItem, TOOL_NAV_GROUPS } from "./constants/nav-items";
import { DensityToggle } from "./DensityToggle";
import { navClassName } from "./nav-styles";
import { useSidebar } from "./SidebarProvider";

const groupLabelClass = "px-3 font-mono text-[10px] uppercase tracking-widest text-muted";

const NavItemLink: FC<{ item: NavItem; onNavigate?: () => void }> = ({ item, onNavigate }) => {
	const pathname = usePathname();
	const { href, end, label, description, icon: Icon } = item;
	const isActive = end ? pathname === href : pathname.startsWith(href);
	return (
		<Link
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
						isActive ? "text-accent" : "text-muted",
					)}
				>
					{description}
				</span>
			</span>
		</Link>
	);
};

const NavGroupSection: FC<{ group: NavGroup; onNavigate?: () => void }> = ({
	group,
	onNavigate,
}) => {
	const labelId = useId();
	return (
		<div role="group" aria-labelledby={labelId} className="flex flex-col gap-1">
			<p id={labelId} className={groupLabelClass}>
				{group.label}
			</p>
			{group.items.map((item) => (
				<NavItemLink key={item.href} item={item} onNavigate={onNavigate} />
			))}
		</div>
	);
};

/** Home, then the tools in their labelled groups (API tools, utilities). */
const NavItems: FC<{ onNavigate?: () => void }> = ({ onNavigate }) => (
	<nav className="flex flex-col gap-4 p-3" aria-label="Main">
		<NavItemLink item={HOME_NAV_ITEM} onNavigate={onNavigate} />
		{TOOL_NAV_GROUPS.map((group) => (
			<NavGroupSection key={group.label} group={group} onNavigate={onNavigate} />
		))}
	</nav>
);

/** Viewer preferences pinned under the nav. */
const SidebarFooter: FC = () => (
	<div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5">
		<span className={cn(groupLabelClass, "px-0")}>Density</span>
		<DensityToggle />
	</div>
);

export const Sidebar: FC = () => {
	const { collapsed, mobileOpen, closeMobile } = useSidebar();

	return (
		<>
			{/* Desktop column */}
			<aside
				className={cn(
					"w-64 max-w-[15vw] shrink-0 flex-col border-r border-line bg-surface/60 backdrop-blur",
					collapsed ? "hidden" : "hidden lg:flex",
				)}
			>
				<div className="scroll-ide min-h-0 flex-1 overflow-y-auto">
					<NavItems />
				</div>
				<SidebarFooter />
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
						<span className="flex items-center gap-2 font-mono text-sm font-semibold text-fg">
							<Image
								src="/android-chrome-192x192.png"
								alt="Ponie"
								width={24}
								height={24}
								className="h-6 w-6 rounded-md"
							/>
							ponie
						</span>
						<button
							type="button"
							onClick={closeMobile}
							aria-label="Close menu"
							className="-m-2.5 rounded-lg p-2.5 text-muted transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
						>
							<X className="h-5 w-5" />
						</button>
					</div>
					<div className="scroll-ide min-h-0 flex-1 overflow-y-auto">
						<NavItems onNavigate={closeMobile} />
					</div>
					<SidebarFooter />
				</aside>
			</div>
		</>
	);
};
