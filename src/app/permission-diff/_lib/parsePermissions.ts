import type {
	CompareResult,
	PermissionEntry,
	PermissionGroupInput,
	RoleBreakdown,
	RolePermissions,
} from "../types";

export function sortPermissions(entries: PermissionEntry[]): PermissionEntry[] {
	return [...entries].sort((a, b) =>
		a.canonical.localeCompare(b.canonical, undefined, { sensitivity: "case" })
	);
}

export function normalizePermissionEntry(
	value: unknown,
	ctx: { key: string; roleName: string; index: number }
): PermissionEntry {
	if (!value || typeof value !== "object") {
		throw new Error(
			`Invalid permission at ${ctx.key} -> ${ctx.roleName} -> permissions[${ctx.index}]. Expected object.`
		);
	}

	const obj = value as Record<string, unknown>;
	if (typeof obj.type !== "string" || obj.type.trim() === "") {
		throw new Error(
			`Invalid permission at ${ctx.key} -> ${ctx.roleName} -> permissions[${ctx.index}]. Field "type" is required.`
		);
	}
	if (typeof obj.resource !== "string" || obj.resource.trim() === "") {
		throw new Error(
			`Invalid permission at ${ctx.key} -> ${ctx.roleName} -> permissions[${ctx.index}]. Field "resource" is required.`
		);
	}
	if (obj.action != null && typeof obj.action !== "string") {
		throw new Error(
			`Invalid permission at ${ctx.key} -> ${ctx.roleName} -> permissions[${ctx.index}]. Field "action" must be a string if provided.`
		);
	}

	const type = obj.type.trim();
	const action = typeof obj.action === "string" ? obj.action.trim() : "";
	const resource = obj.resource.trim();

	return {
		type,
		action,
		resource,
		raw: {
			type,
			...(action ? { action } : {}),
			resource,
		},
		canonical: `${type}|${action}|${resource}`,
	};
}

export function parseGroupInput(rawGroup: unknown, label: string): PermissionGroupInput {
	if (!Array.isArray(rawGroup)) {
		throw new Error(`${label} JSON must be an array of role objects.`);
	}

	const byCanonical = new Map<string, PermissionEntry>();
	const roleBreakdown: RoleBreakdown[] = [];
	const roles: RolePermissions[] = rawGroup.map((roleValue, roleIdx) => {
		if (!roleValue || typeof roleValue !== "object") {
			throw new Error(`Invalid role at ${label}[${roleIdx}]. Expected object.`);
		}

		const roleObj = roleValue as Record<string, unknown>;
		if (typeof roleObj.name !== "string" || roleObj.name.trim() === "") {
			throw new Error(`Invalid role at ${label}[${roleIdx}]. Field "name" is required.`);
		}
		if (!Array.isArray(roleObj.permissions)) {
			throw new Error(
				`Invalid role at ${label}[${roleIdx}] (${roleObj.name}). Field "permissions" must be an array.`
			);
		}

		const roleName = roleObj.name.trim();
		const rolePermissions = roleObj.permissions.map((permissionValue, permissionIdx) =>
			normalizePermissionEntry(permissionValue, {
				key: label,
				roleName,
				index: permissionIdx,
			})
		);

		const uniqueRoleKeys = new Set<string>();
		for (const entry of rolePermissions) {
			uniqueRoleKeys.add(entry.canonical);
			if (!byCanonical.has(entry.canonical)) {
				byCanonical.set(entry.canonical, entry);
			}
		}

		roleBreakdown.push({ name: roleName, count: uniqueRoleKeys.size });
		return {
			name: roleName,
			permissions: rolePermissions,
		};
	});

	return {
		label,
		roles,
		allPermissions: sortPermissions(Array.from(byCanonical.values())),
		byCanonical,
		roleBreakdown,
	};
}

export function parseRolesJson(rawJson: string, label: string): unknown {
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawJson);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown parse error.";
		throw new Error(`Invalid ${label} JSON input. ${message}`);
	}
	return parsed;
}

export function parseAndCompare(group1RawJson: string, group2RawJson: string): CompareResult {
	const parsedGroup1 = parseRolesJson(group1RawJson, "Group 1");
	const parsedGroup2 = parseRolesJson(group2RawJson, "Group 2");
	const group1 = parseGroupInput(parsedGroup1, "Group 1");
	const group2 = parseGroupInput(parsedGroup2, "Group 2");

	const onlyInGroup1 = sortPermissions(
		group1.allPermissions.filter((entry) => !group2.byCanonical.has(entry.canonical))
	);
	const onlyInGroup2 = sortPermissions(
		group2.allPermissions.filter((entry) => !group1.byCanonical.has(entry.canonical))
	);
	const common = sortPermissions(
		group1.allPermissions.filter((entry) => group2.byCanonical.has(entry.canonical))
	);

	return {
		group1,
		group2,
		onlyInGroup1,
		onlyInGroup2,
		common,
	};
}
