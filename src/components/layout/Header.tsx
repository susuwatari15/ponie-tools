import type { FC } from "react";
import { NavLink } from "react-router-dom";
import { WORKSPACE_NAV_ITEMS } from "./constants/nav-items";
import { navClassName } from "./nav-styles";

export const Header: FC = () => {
	return (
		<header>
			<nav className="mt-4 flex gap-2 lg:hidden" aria-label="Workspace">
				{WORKSPACE_NAV_ITEMS.map(({ to, end, label }) => (
					<NavLink key={to} to={to} end={end} className={navClassName}>
						{label}
					</NavLink>
				))}
			</nav>
		</header>
	);
};
