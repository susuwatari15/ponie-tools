"use client";

import type { FC } from "react";
import { WORKSPACE_NAV_ITEMS } from "./constants/nav-items";
import { NavLink } from "./NavLink";

export const Header: FC = () => {
	return (
		<header>
			<nav className="mt-4 flex gap-2 lg:hidden" aria-label="Workspace">
				{WORKSPACE_NAV_ITEMS.map(({ href, end, label }) => (
					<NavLink key={href} href={href} end={end}>
						{label}
					</NavLink>
				))}
			</nav>
		</header>
	);
};
