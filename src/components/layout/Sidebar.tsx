import type { FC } from "react";
import { NavLink } from "react-router-dom";
import { WORKSPACE_NAV_ITEMS } from "./constants/nav-items";
import { navClassName } from "./nav-styles";

export const Sidebar: FC = () => {
	return (
		<aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/70 lg:block">
			<nav className="flex flex-col gap-2 p-4" aria-label="Main">
				{WORKSPACE_NAV_ITEMS.map(({ to, end, label, icon: Icon }) => (
					<NavLink key={to} to={to} end={end} className={navClassName}>
						<Icon className="size-[1.125rem] shrink-0 opacity-80" aria-hidden />
						{label}
					</NavLink>
				))}
			</nav>
		</aside>
	);
};
