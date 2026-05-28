import type { LucideIcon } from "lucide-react";
import { Braces, GitCompare, ShieldCheck } from "lucide-react";

export type NavItem = {
	href: string;
	end?: boolean;
	label: string;
	icon: LucideIcon;
};

export const WORKSPACE_NAV_ITEMS: NavItem[] = [
	{ href: "/", end: true, label: "Swagger Minifier", icon: Braces },
	{ href: "/swagger-compare", label: "Swagger Compare", icon: GitCompare },
	{ href: "/permission-diff", label: "Permission Diff", icon: ShieldCheck },
];
