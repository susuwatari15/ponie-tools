"use client";

import type { FC } from "react";
import { WORKSPACE_NAV_ITEMS } from "./constants/nav-items";
import { NavLink } from "./NavLink";
import { useSidebar } from "./SidebarProvider";

export const Sidebar: FC = () => {
	const { collapsed } = useSidebar();

	return (
		<aside
			className={`w-64 shrink-0 border-r border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/70 ${
				collapsed ? "hidden" : "hidden lg:block"
			}`}
		>
			<nav className="flex flex-col gap-2 p-4" aria-label="Main">
				{WORKSPACE_NAV_ITEMS.map(({ href, end, label, icon: Icon }) => (
					<NavLink key={href} href={href} end={end}>
						<Icon className="size-[1.125rem] shrink-0 opacity-80" aria-hidden />
						{label}
					</NavLink>
				))}
			</nav>
		</aside>
	);
};

