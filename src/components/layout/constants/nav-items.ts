export type NavItem = {
	to: string;
	end?: boolean;
	label: string;
};

export const WORKSPACE_NAV_ITEMS: NavItem[] = [
	{ to: "/", end: true, label: "Swagger Minifier" },
	{ to: "/swagger-compare", label: "Swagger Compare" },
	{ to: "/permission-diff", label: "Permission Diff" },
];
