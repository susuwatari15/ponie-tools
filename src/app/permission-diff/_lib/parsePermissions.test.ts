import { describe, expect, it } from "vitest";
import {
	normalizePermissionEntry,
	parseAndCompare,
	parseGroupInput,
	parseRolesJson,
	sortPermissions,
} from "./parsePermissions";

const ctx = { key: "Group 1", roleName: "admin", index: 0 };

describe("normalizePermissionEntry", () => {
	it("trims fields and builds the canonical key", () => {
		expect(normalizePermissionEntry({ type: " api ", action: " read ", resource: " /users " }, ctx)).toEqual({
			type: "api",
			action: "read",
			resource: "/users",
			raw: { type: "api", action: "read", resource: "/users" },
			canonical: "api|read|/users",
		});
	});

	it("treats a missing, null or blank action as empty and omits it from raw", () => {
		for (const action of [undefined, null, "  "]) {
			const entry = normalizePermissionEntry({ type: "menu", action, resource: "home" }, ctx);
			expect(entry.action).toBe("");
			expect(entry.raw).toEqual({ type: "menu", resource: "home" });
			expect(entry.canonical).toBe("menu||home");
		}
	});

	it("rejects invalid entries with a located message", () => {
		expect(() => normalizePermissionEntry("x", ctx)).toThrow(
			"Invalid permission at Group 1 -> admin -> permissions[0]. Expected object.",
		);
		expect(() => normalizePermissionEntry(null, ctx)).toThrow("Expected object.");
		expect(() => normalizePermissionEntry({ resource: "r" }, ctx)).toThrow('Field "type" is required.');
		expect(() => normalizePermissionEntry({ type: " ", resource: "r" }, ctx)).toThrow(
			'Field "type" is required.',
		);
		expect(() => normalizePermissionEntry({ type: "t" }, ctx)).toThrow('Field "resource" is required.');
		expect(() => normalizePermissionEntry({ type: "t", resource: "r", action: 1 }, ctx)).toThrow(
			'Field "action" must be a string if provided.',
		);
	});
});

describe("sortPermissions", () => {
	it("sorts by canonical key without mutating the input", () => {
		const entries = ["menu||b", "api|read|a", "api|delete|a"].map((canonical) => {
			const [type = "", action = "", resource = ""] = canonical.split("|");
			return normalizePermissionEntry({ type, action, resource }, ctx);
		});
		const sorted = sortPermissions(entries);
		expect(sorted.map((e) => e.canonical)).toEqual(["api|delete|a", "api|read|a", "menu||b"]);
		expect(entries[0]?.canonical).toBe("menu||b");
	});
});

describe("parseGroupInput", () => {
	it("dedupes permissions across and within roles and counts unique ones per role", () => {
		const group = parseGroupInput(
			[
				{
					name: " admin ",
					permissions: [
						{ type: "api", action: "read", resource: "/users" },
						{ type: "api", action: "read", resource: "/users" },
						{ type: "api", action: "write", resource: "/users" },
					],
				},
				{ name: "viewer", permissions: [{ type: "api", action: "read", resource: "/users" }] },
				{ name: "empty", permissions: [] },
			],
			"Group 1",
		);

		expect(group.label).toBe("Group 1");
		expect(group.roles.map((r) => [r.name, r.permissions.length])).toEqual([
			["admin", 3],
			["viewer", 1],
			["empty", 0],
		]);
		expect(group.roleBreakdown).toEqual([
			{ name: "admin", count: 2 },
			{ name: "viewer", count: 1 },
			{ name: "empty", count: 0 },
		]);
		expect(group.allPermissions.map((p) => p.canonical)).toEqual(["api|read|/users", "api|write|/users"]);
		expect(group.byCanonical.size).toBe(2);
	});

	it("rejects malformed groups and roles", () => {
		expect(() => parseGroupInput({}, "Group 1")).toThrow("Group 1 JSON must be an array of role objects.");
		expect(() => parseGroupInput([1], "Group 1")).toThrow("Invalid role at Group 1[0]. Expected object.");
		expect(() => parseGroupInput([{ permissions: [] }], "Group 1")).toThrow('Field "name" is required.');
		expect(() => parseGroupInput([{ name: "r" }], "Group 2")).toThrow(
			'Invalid role at Group 2[0] (r). Field "permissions" must be an array.',
		);
		expect(() => parseGroupInput([{ name: "r", permissions: [{ type: "t" }] }], "Group 2")).toThrow(
			"Invalid permission at Group 2 -> r -> permissions[0].",
		);
	});
});

describe("parseRolesJson", () => {
	it("parses valid JSON and wraps parse errors with the label", () => {
		expect(parseRolesJson("[]", "Group 1")).toEqual([]);
		expect(() => parseRolesJson("[", "Group 2")).toThrow(/^Invalid Group 2 JSON input\. /);
	});
});

describe("parseAndCompare", () => {
	const role = (name: string, permissions: [string, string, string][]) => ({
		name,
		permissions: permissions.map(([type, action, resource]) => ({ type, action, resource })),
	});

	it("splits permissions into only-in-1, only-in-2 and common", () => {
		const group1 = JSON.stringify([
			role("admin", [
				["api", "read", "/users"],
				["api", "delete", "/users"],
			]),
		]);
		const group2 = JSON.stringify([
			role("ops", [["api", "read", "/users"]]),
			role("support", [["menu", "", "tickets"]]),
		]);

		const result = parseAndCompare(group1, group2);
		expect(result.onlyInGroup1.map((p) => p.canonical)).toEqual(["api|delete|/users"]);
		expect(result.onlyInGroup2.map((p) => p.canonical)).toEqual(["menu||tickets"]);
		expect(result.common.map((p) => p.canonical)).toEqual(["api|read|/users"]);
		expect(result.group1.label).toBe("Group 1");
		expect(result.group2.roleBreakdown).toEqual([
			{ name: "ops", count: 1 },
			{ name: "support", count: 1 },
		]);
	});

	it("matches permissions after trimming whitespace", () => {
		const result = parseAndCompare(
			JSON.stringify([role("a", [["api", "read", "/x"]])]),
			JSON.stringify([role("b", [[" api", "read ", " /x "]])]),
		);
		expect(result.common).toHaveLength(1);
		expect(result.onlyInGroup1).toEqual([]);
		expect(result.onlyInGroup2).toEqual([]);
	});

	it("is case-sensitive", () => {
		const result = parseAndCompare(
			JSON.stringify([role("a", [["api", "read", "/x"]])]),
			JSON.stringify([role("b", [["API", "read", "/x"]])]),
		);
		expect(result.common).toEqual([]);
	});

	it("reports which group is invalid", () => {
		expect(() => parseAndCompare("nope", "[]")).toThrow(/^Invalid Group 1 JSON input/);
		expect(() => parseAndCompare("[]", "{}")).toThrow("Group 2 JSON must be an array of role objects.");
	});
});
