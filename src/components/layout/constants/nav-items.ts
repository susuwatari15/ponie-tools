import type { LucideIcon } from "lucide-react";
import { Braces, CalendarClock, FileJson, GitCompare, LayoutDashboard, Ruler, ShieldCheck } from "lucide-react";

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

/** OpenAPI / permission tools, in workflow order. */
export const API_TOOL_NAV_ITEMS: NavItem[] = [
	{
		href: "/minifier",
		label: "Swagger Minifier",
		description: "Trim a spec to the endpoints you need",
		icon: Braces,
	},
	{
		href: "/swagger-compare",
		label: "Swagger Compare",
		description: "Diff snapshots, live or pasted specs",
		icon: GitCompare,
	},
	{
		href: "/permission-diff",
		label: "Permission Diff",
		description: "Compare permissions across role groups",
		icon: ShieldCheck,
	},
];

/** Small standalone converters and formatters. */
export const UTILITY_NAV_ITEMS: NavItem[] = [
	{
		href: "/px-to-rem",
		label: "PX ↔ REM",
		description: "Convert pixels and rem units",
		icon: Ruler,
	},
	{
		href: "/epoch-converter",
		label: "Epoch Converter",
		description: "Convert Unix timestamps and dates",
		icon: CalendarClock,
	},
	{
		href: "/json-formatter",
		label: "JSON Formatter",
		description: "Beautify, minify and validate JSON",
		icon: FileJson,
	},
];

export type NavGroup = {
	label: string;
	items: NavItem[];
};

export const TOOL_NAV_GROUPS: NavGroup[] = [
	{ label: "API tools", items: API_TOOL_NAV_ITEMS },
	{ label: "Utilities", items: UTILITY_NAV_ITEMS },
];

/** Every tool, flattened (API tools first). */
export const TOOL_NAV_ITEMS: NavItem[] = [...API_TOOL_NAV_ITEMS, ...UTILITY_NAV_ITEMS];

export const WORKSPACE_NAV_ITEMS: NavItem[] = [HOME_NAV_ITEM, ...TOOL_NAV_ITEMS];
