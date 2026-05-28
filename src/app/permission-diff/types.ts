export type PermissionEntry = {
	type: string;
	action: string;
	resource: string;
	raw: {
		type: string;
		action?: string;
		resource: string;
	};
	canonical: string;
};

export type RolePermissions = {
	name: string;
	permissions: PermissionEntry[];
};

export type RoleBreakdown = {
	name: string;
	count: number;
};

export type PermissionGroupInput = {
	label: string;
	roles: RolePermissions[];
	allPermissions: PermissionEntry[];
	byCanonical: Map<string, PermissionEntry>;
	roleBreakdown: RoleBreakdown[];
};

export type CompareResult = {
	group1: PermissionGroupInput;
	group2: PermissionGroupInput;
	onlyInGroup1: PermissionEntry[];
	onlyInGroup2: PermissionEntry[];
	common: PermissionEntry[];
};

export type SectionId = "only1" | "only2" | "common" | "all";
