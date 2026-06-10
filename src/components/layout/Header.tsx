"use client";

import type { FC } from "react";
import { WORKSPACE_NAV_ITEMS } from "./constants/nav-items";
import { NavLink } from "./NavLink";
import { SidebarToggle } from "./SidebarToggle";

export const Header: FC = () => {
	return (
		<header className="flex items-center gap-3 px-4 pt-4">
			<SidebarToggle />
			<nav className="flex gap-2 lg:hidden" aria-label="Workspace">
				{WORKSPACE_NAV_ITEMS.map(({ href, end, label }) => (
					<NavLink key={href} href={href} end={end}>
						{label}
					</NavLink>
				))}
			</nav>
		</header>
	);
};

