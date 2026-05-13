import type { LucideIcon } from "lucide-react";
import { Braces, GitCompare, ShieldCheck } from "lucide-react";

export type NavItem = {
	to: string;
	end?: boolean;
	label: string;
	icon: LucideIcon;
};

export const WORKSPACE_NAV_ITEMS: NavItem[] = [
	{ to: "/", end: true, label: "Swagger Minifier", icon: Braces },
	{ to: "/swagger-compare", label: "Swagger Compare", icon: GitCompare },
	{ to: "/permission-diff", label: "Permission Diff", icon: ShieldCheck },
];
