import type { LucideIcon } from "lucide-react";
import { Braces, GitCompare, LayoutDashboard, Ruler, ShieldCheck } from "lucide-react";

export type NavItem = {
	href: string;
	end?: boolean;
	label: string;
	description: string;
	icon: LucideIcon;
};

export const HOME_NAV_ITEM: NavItem = {
	href: "/",
	end: true,
	label: "Home",
	description: "Overview of every tool",
	icon: LayoutDashboard,
};

/** The three tools, in workflow order. */
export const TOOL_NAV_ITEMS: NavItem[] = [
	{
		href: "/minifier",
		label: "Swagger Minifier",
		description: "Trim a spec to the endpoints you need",
		icon: Braces,
	},
	{
		href: "/swagger-compare",
		label: "Swagger Compare",
		description: "Diff two saved snapshots",
		icon: GitCompare,
	},
	{
		href: "/permission-diff",
		label: "Permission Diff",
		description: "Compare permissions across role groups",
		icon: ShieldCheck,
	},
	{
		href: "/px-to-rem",
		label: "PX ↔ REM",
		description: "Convert pixels and rem units",
		icon: Ruler,
	},
];

export const WORKSPACE_NAV_ITEMS: NavItem[] = [HOME_NAV_ITEM, ...TOOL_NAV_ITEMS];
