import { ChevronDown, Moon, Search, Sun } from "lucide-react";
import { type FC, useMemo, useState } from "react";

type ThemeMode = "dark" | "light";

type PermissionEntry = {
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

type RolePermissions = {
	name: string;
	permissions: PermissionEntry[];
};

type PermissionGroupInput = {
	label: string;
	roles: RolePermissions[];
	allPermissions: PermissionEntry[];
	byCanonical: Map<string, PermissionEntry>;
	roleBreakdown: RoleBreakdown[];
};

type RoleBreakdown = {
	name: string;
	count: number;
};

type CompareResult = {
	group1: PermissionGroupInput;
	group2: PermissionGroupInput;
	onlyInGroup1: PermissionEntry[];
	onlyInGroup2: PermissionEntry[];
	common: PermissionEntry[];
};

type SectionId = "only1" | "only2" | "common" | "all";

const THEME_STORAGE_KEY = "permission-diff-theme";

const SAMPLE_GROUP_1_JSON = JSON.stringify(
	[
		{
			name: "Merchant Admin",
			permissions: [
				{ type: "permission", action: "GET", resource: "/api/v1/orders" },
				{ type: "permission", action: "POST", resource: "/api/v1/orders" },
				{ type: "tenant", resource: "mch" },
			],
		},
		{
			name: "Merchant Viewer",
			permissions: [
				{ type: "permission", action: "GET", resource: "/api/v1/orders" },
				{ type: "permission", action: "GET", resource: "/api/v1/reports" },
			],
		},
	],
	null,
	2
);

const SAMPLE_GROUP_2_JSON = JSON.stringify(
	[
		{
			name: "Ops Admin",
			permissions: [
				{ type: "permission", action: "GET", resource: "/api/v1/orders" },
				{ type: "tenant", resource: "mch" },
				{ type: "market", resource: "vn" },
			],
		},
	],
	null,
	2
);

function getInitialTheme(): ThemeMode {
	if (typeof window === "undefined") return "dark";
	const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
	if (saved === "light" || saved === "dark") return saved;
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function sortPermissions(entries: PermissionEntry[]): PermissionEntry[] {
	return [...entries].sort((a, b) =>
		a.canonical.localeCompare(b.canonical, undefined, { sensitivity: "case" })
	);
}

function normalizePermissionEntry(
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

function parseGroupInput(rawGroup: unknown, label: string): PermissionGroupInput {
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

function parseRolesJson(rawJson: string, label: string): unknown {
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawJson);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown parse error.";
		throw new Error(`Invalid ${label} JSON input. ${message}`);
	}
	return parsed;
}

function parseAndCompare(group1RawJson: string, group2RawJson: string): CompareResult {
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

function matchesSearch(entry: PermissionEntry, query: string): boolean {
	if (!query) return true;
	const q = query.toLowerCase();
	const printable = `[${entry.action || entry.type}] ${entry.resource}`.toLowerCase();
	const full = JSON.stringify(entry.raw).toLowerCase();
	return printable.includes(q) || full.includes(q);
}

function getMethodPillClass(entry: PermissionEntry, theme: ThemeMode): string {
	const token = entry.action.toUpperCase();
	if (token === "GET")
		return theme === "dark"
			? "border-blue-500/70 bg-blue-950/60 text-blue-200"
			: "border-blue-300 bg-blue-50 text-blue-800";
	if (token === "POST")
		return theme === "dark"
			? "border-emerald-500/70 bg-emerald-950/50 text-emerald-200"
			: "border-emerald-300 bg-emerald-50 text-emerald-800";
	if (token === "PUT" || token === "PATCH")
		return theme === "dark"
			? "border-amber-500/70 bg-amber-950/50 text-amber-200"
			: "border-amber-300 bg-amber-50 text-amber-800";
	if (token === "DELETE")
		return theme === "dark"
			? "border-rose-500/70 bg-rose-950/50 text-rose-200"
			: "border-rose-300 bg-rose-50 text-rose-800";

	return theme === "dark"
		? "border-violet-500/70 bg-violet-950/50 text-violet-200"
		: "border-violet-300 bg-violet-50 text-violet-800";
}

async function copyText(text: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return;
	}

	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	document.body.appendChild(textarea);
	textarea.select();
	document.execCommand("copy");
	document.body.removeChild(textarea);
}

type PermissionListSectionProps = {
	id: SectionId;
	title: string;
	description: string;
	items: PermissionEntry[];
	isOpen: boolean;
	theme: ThemeMode;
	search: string;
	emptyMessage: string;
	onToggle: (id: SectionId) => void;
	onCopyJson: (id: SectionId, items: PermissionEntry[]) => void;
	onCopyText: (id: SectionId, items: PermissionEntry[]) => void;
	copyStatus: string | null;
};

const PermissionListSection: FC<PermissionListSectionProps> = ({
	id,
	title,
	description,
	items,
	isOpen,
	theme,
	search,
	emptyMessage,
	onToggle,
	onCopyJson,
	onCopyText,
	copyStatus,
}) => {
	const filteredItems = useMemo(
		() => items.filter((entry) => matchesSearch(entry, search)),
		[items, search]
	);

	const boxClass =
		theme === "dark"
			? "border-slate-700/70 bg-slate-900/70"
			: "border-slate-300 bg-white/90 shadow-sm";

	const mutedText = theme === "dark" ? "text-slate-400" : "text-slate-600";
	const headingText = theme === "dark" ? "text-slate-100" : "text-slate-900";

	return (
		<section className={`rounded-xl border ${boxClass}`}>
			<div className="flex items-center justify-between gap-3 border-b border-inherit px-4 py-3">
				<button
					type="button"
					className="flex min-w-0 flex-1 items-center gap-3 text-left"
					onClick={() => onToggle(id)}
				>
					<ChevronDown
						className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
							isOpen ? "rotate-0" : "-rotate-90"
						}`}
					/>
					<div className="min-w-0">
						<h3 className={`truncate text-sm font-semibold ${headingText}`}>
							{title}{" "}
							<span className="ml-2 rounded-full border border-current/30 px-2 py-0.5 text-xs">
								{filteredItems.length}
							</span>
						</h3>
						<p className={`text-xs ${mutedText}`}>{description}</p>
					</div>
				</button>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => onCopyJson(id, filteredItems)}
						className="rounded-md border border-slate-500/50 px-2 py-1 text-xs transition hover:bg-slate-800/30"
					>
						Copy JSON
					</button>
					<button
						type="button"
						onClick={() => onCopyText(id, filteredItems)}
						className="rounded-md border border-slate-500/50 px-2 py-1 text-xs transition hover:bg-slate-800/30"
					>
						Copy Text
					</button>
				</div>
			</div>
			<div
				className="grid transition-[grid-template-rows,opacity] duration-300"
				style={{ gridTemplateRows: isOpen ? "1fr" : "0fr", opacity: isOpen ? 1 : 0.65 }}
			>
				<div className="overflow-hidden">
					<div className="space-y-3 px-4 py-3">
						{copyStatus ? <p className={`text-xs ${mutedText}`}>{copyStatus}</p> : null}
						{filteredItems.length === 0 ? (
							<p className={`text-sm ${mutedText}`}>{emptyMessage}</p>
						) : (
							<ul className="flex flex-wrap gap-2">
								{filteredItems.map((entry) => {
									const method = entry.action || entry.type;
									return (
										<li key={entry.canonical}>
											<span
												className={`inline-flex rounded-full border px-3 py-1 font-mono text-xs ${getMethodPillClass(
													entry,
													theme
												)}`}
												title={JSON.stringify(entry.raw, null, 2)}
											>
												[{method}] {entry.resource}
											</span>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</div>
			</div>
		</section>
	);
};

export const PermissionDiffViewer: FC = () => {
	const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
	const [group1RawJson, setGroup1RawJson] = useState("");
	const [group2RawJson, setGroup2RawJson] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<CompareResult | null>(null);
	const [copyStatusMap, setCopyStatusMap] = useState<Record<SectionId, string | null>>({
		only1: null,
		only2: null,
		common: null,
		all: null,
	});
	const [allGroupView, setAllGroupView] = useState<"group1" | "group2">("group1");
	const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
		only1: true,
		only2: true,
		common: true,
		all: true,
	});

	const themeClasses =
		theme === "dark"
			? "bg-slate-950/40 text-slate-100"
			: "bg-slate-50 text-slate-900";
	const panelClasses =
		theme === "dark"
			? "border-slate-700/70 bg-slate-900/80"
			: "border-slate-300 bg-white shadow-sm";
	const mutedText = theme === "dark" ? "text-slate-400" : "text-slate-600";
	const inputClasses =
		theme === "dark"
			? "border-slate-700 bg-slate-950/80 text-slate-100 placeholder:text-slate-500"
			: "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400";

	const summary = useMemo(() => {
		if (!result) return null;
		return {
			group1: result.group1.allPermissions.length,
			group2: result.group2.allPermissions.length,
			common: result.common.length,
			only1: result.onlyInGroup1.length,
			only2: result.onlyInGroup2.length,
		};
	}, [result]);

	const allGroupItems = useMemo(() => {
		if (!result) return [];
		return allGroupView === "group1" ? result.group1.allPermissions : result.group2.allPermissions;
	}, [result, allGroupView]);

	const toggleSection = (id: SectionId) => {
		setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	const handleCompare = () => {
		setError(null);
		setCopyStatusMap({ only1: null, only2: null, common: null, all: null });
		try {
			const next = parseAndCompare(group1RawJson, group2RawJson);
			setResult(next);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			setResult(null);
			setError(message);
		}
	};

	const setCopied = (id: SectionId, value: string) => {
		setCopyStatusMap((prev) => ({ ...prev, [id]: value }));
		window.setTimeout(() => {
			setCopyStatusMap((prev) => ({ ...prev, [id]: null }));
		}, 2000);
	};

	const handleCopyJson = async (id: SectionId, items: PermissionEntry[]) => {
		try {
			await copyText(
				JSON.stringify(
					items.map((item) => item.raw),
					null,
					2
				)
			);
			setCopied(id, "Copied JSON");
		} catch {
			setCopied(id, "Copy failed");
		}
	};

	const handleCopyText = async (id: SectionId, items: PermissionEntry[]) => {
		try {
			const lines = items.map((item) => `[${item.action || item.type}] ${item.resource}`).join("\n");
			await copyText(lines);
			setCopied(id, "Copied text list");
		} catch {
			setCopied(id, "Copy failed");
		}
	};

	const loadSample = () => {
		setGroup1RawJson(SAMPLE_GROUP_1_JSON);
		setGroup2RawJson(SAMPLE_GROUP_2_JSON);
		setError(null);
	};

	const toggleTheme = () => {
		setTheme((prev) => {
			const next = prev === "dark" ? "light" : "dark";
			window.localStorage.setItem(THEME_STORAGE_KEY, next);
			return next;
		});
	};

	return (
		<div className={`space-y-4 p-4 lg:p-6 ${themeClasses}`}>
			<div className={`rounded-xl border px-4 py-3 ${panelClasses}`}>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 className="text-xl font-semibold tracking-tight">Permission Diff Viewer</h2>
						<p className={`text-sm ${mutedText}`}>
							Compare permissions across two role groups from raw JSON.
						</p>
					</div>
					<button
						type="button"
						onClick={toggleTheme}
						className="inline-flex items-center gap-2 rounded-md border border-slate-500/50 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-800/20"
					>
						{theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
						{theme === "dark" ? "Light" : "Dark"} theme
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
				<section className={`rounded-xl border p-4 ${panelClasses}`}>
					<h3 className="text-sm font-semibold">Input</h3>
					<label className="mt-3 flex flex-col gap-1">
						<span className={`text-xs font-medium uppercase tracking-wide ${mutedText}`}>
							Group 1 JSON
						</span>
						<textarea
							value={group1RawJson}
							onChange={(e) => setGroup1RawJson(e.target.value)}
							className={`h-48 w-full resize-y rounded-md border p-3 font-mono text-xs outline-none focus:border-accent ${inputClasses}`}
							placeholder='[{"name":"Merchant Admin","permissions":[{"type":"permission","action":"GET","resource":"/api/v1/orders"}]}]'
						/>
					</label>

					<label className="mt-3 flex flex-col gap-1">
						<span className={`text-xs font-medium uppercase tracking-wide ${mutedText}`}>
							Group 2 JSON
						</span>
						<textarea
							value={group2RawJson}
							onChange={(e) => setGroup2RawJson(e.target.value)}
							className={`h-48 w-full resize-y rounded-md border p-3 font-mono text-xs outline-none focus:border-accent ${inputClasses}`}
							placeholder='[{"name":"Ops Admin","permissions":[{"type":"permission","action":"GET","resource":"/api/v1/orders"}]}]'
						/>
					</label>

					<div className="mt-3 flex flex-wrap gap-2">
						<button
							type="button"
							onClick={handleCompare}
							className="rounded-md border border-accent bg-accent/20 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-accent/30"
						>
							Compare
						</button>
						<button
							type="button"
							onClick={loadSample}
							className="rounded-md border border-slate-500/50 px-3 py-2 text-xs font-semibold transition hover:bg-slate-800/20"
						>
							Load sample
						</button>
					</div>

					{error ? (
						<div
							className={`mt-3 rounded-md border px-3 py-2 text-sm ${
								theme === "dark"
									? "border-rose-700/60 bg-rose-950/40 text-rose-200"
									: "border-rose-300 bg-rose-50 text-rose-700"
							}`}
						>
							{error}
						</div>
					) : null}
				</section>

				<section className="space-y-4">
					{result ? (
						<>
							<div className={`sticky top-0 z-10 rounded-xl border px-4 py-3 ${panelClasses}`}>
								<div className="flex flex-wrap items-center gap-2 text-sm">
									<span className="rounded-full border border-current/20 px-2 py-0.5">
										{result.group1.label}: {summary?.group1 ?? 0}
									</span>
									<span className="rounded-full border border-current/20 px-2 py-0.5">
										{result.group2.label}: {summary?.group2 ?? 0}
									</span>
									<span className="rounded-full border border-current/20 px-2 py-0.5 text-blue-300">
										Common: {summary?.common ?? 0}
									</span>
									<span className="rounded-full border border-current/20 px-2 py-0.5 text-rose-300">
										Only in G1: {summary?.only1 ?? 0}
									</span>
									<span className="rounded-full border border-current/20 px-2 py-0.5 text-emerald-300">
										Only in G2: {summary?.only2 ?? 0}
									</span>
								</div>
								<label className="mt-3 flex items-center gap-2 rounded-md border border-slate-500/40 px-2.5 py-2">
									<Search size={14} className={mutedText} />
									<input
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Filter visible permissions..."
										className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
									/>
								</label>
							</div>

							<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
								<div className={`rounded-xl border p-3 ${panelClasses}`}>
									<h4 className="text-sm font-semibold">{result.group1.label} role breakdown</h4>
									<ul className="mt-2 space-y-1 text-sm">
										{result.group1.roleBreakdown.map((row) => (
											<li key={row.name} className="flex items-center justify-between gap-2">
												<span className="truncate">{row.name}</span>
												<span className={`text-xs ${mutedText}`}>{row.count}</span>
											</li>
										))}
									</ul>
								</div>
								<div className={`rounded-xl border p-3 ${panelClasses}`}>
									<h4 className="text-sm font-semibold">{result.group2.label} role breakdown</h4>
									<ul className="mt-2 space-y-1 text-sm">
										{result.group2.roleBreakdown.map((row) => (
											<li key={row.name} className="flex items-center justify-between gap-2">
												<span className="truncate">{row.name}</span>
												<span className={`text-xs ${mutedText}`}>{row.count}</span>
											</li>
										))}
									</ul>
								</div>
							</div>

							<PermissionListSection
								id="only1"
								title="Only in Group 1"
								description={`${result.group1.label} permissions missing from ${result.group2.label}.`}
								items={result.onlyInGroup1}
								isOpen={openSections.only1}
								theme={theme}
								search={searchQuery}
								emptyMessage="No unique permissions in Group 1."
								onToggle={toggleSection}
								onCopyJson={handleCopyJson}
								onCopyText={handleCopyText}
								copyStatus={copyStatusMap.only1}
							/>
							<PermissionListSection
								id="only2"
								title="Only in Group 2"
								description={`${result.group2.label} permissions missing from ${result.group1.label}.`}
								items={result.onlyInGroup2}
								isOpen={openSections.only2}
								theme={theme}
								search={searchQuery}
								emptyMessage="No unique permissions in Group 2."
								onToggle={toggleSection}
								onCopyJson={handleCopyJson}
								onCopyText={handleCopyText}
								copyStatus={copyStatusMap.only2}
							/>
							<PermissionListSection
								id="common"
								title="Common (Intersection)"
								description="Permissions present in both groups."
								items={result.common}
								isOpen={openSections.common}
								theme={theme}
								search={searchQuery}
								emptyMessage="No shared permissions."
								onToggle={toggleSection}
								onCopyJson={handleCopyJson}
								onCopyText={handleCopyText}
								copyStatus={copyStatusMap.common}
							/>

							<div className={`rounded-xl border ${panelClasses}`}>
								<div className="flex flex-wrap items-center justify-between gap-3 border-b border-inherit px-4 py-3">
									<button
										type="button"
										className="flex min-w-0 flex-1 items-center gap-3 text-left"
										onClick={() => toggleSection("all")}
									>
										<ChevronDown
											className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
												openSections.all ? "rotate-0" : "-rotate-90"
											}`}
										/>
										<div>
											<h3 className="text-sm font-semibold">
												All permissions{" "}
												<span className="ml-2 rounded-full border border-current/30 px-2 py-0.5 text-xs">
													{
														allGroupItems.filter((entry) =>
															matchesSearch(entry, searchQuery)
														).length
													}
												</span>
											</h3>
											<p className={`text-xs ${mutedText}`}>
												Toggle complete permission list by group.
											</p>
										</div>
									</button>
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => setAllGroupView("group1")}
											className={`rounded-md px-2.5 py-1 text-xs transition ${
												allGroupView === "group1"
													? "bg-accent/20 text-accent ring-1 ring-accent/50"
													: "border border-slate-500/50"
											}`}
										>
											{result.group1.label}
										</button>
										<button
											type="button"
											onClick={() => setAllGroupView("group2")}
											className={`rounded-md px-2.5 py-1 text-xs transition ${
												allGroupView === "group2"
													? "bg-accent/20 text-accent ring-1 ring-accent/50"
													: "border border-slate-500/50"
											}`}
										>
											{result.group2.label}
										</button>
										<button
											type="button"
											onClick={() =>
												handleCopyJson(
													"all",
													allGroupItems.filter((entry) =>
														matchesSearch(entry, searchQuery)
													)
												)
											}
											className="rounded-md border border-slate-500/50 px-2 py-1 text-xs transition hover:bg-slate-800/30"
										>
											Copy JSON
										</button>
										<button
											type="button"
											onClick={() =>
												handleCopyText(
													"all",
													allGroupItems.filter((entry) =>
														matchesSearch(entry, searchQuery)
													)
												)
											}
											className="rounded-md border border-slate-500/50 px-2 py-1 text-xs transition hover:bg-slate-800/30"
										>
											Copy Text
										</button>
									</div>
								</div>
								<div
									className="grid transition-[grid-template-rows,opacity] duration-300"
									style={{
										gridTemplateRows: openSections.all ? "1fr" : "0fr",
										opacity: openSections.all ? 1 : 0.65,
									}}
								>
									<div className="overflow-hidden">
										<div className="space-y-3 px-4 py-3">
											{copyStatusMap.all ? (
												<p className={`text-xs ${mutedText}`}>{copyStatusMap.all}</p>
											) : null}
											<ul className="flex flex-wrap gap-2">
												{allGroupItems
													.filter((entry) => matchesSearch(entry, searchQuery))
													.map((entry) => (
														<li key={entry.canonical}>
															<span
																className={`inline-flex rounded-full border px-3 py-1 font-mono text-xs ${getMethodPillClass(
																	entry,
																	theme
																)}`}
																title={JSON.stringify(entry.raw, null, 2)}
															>
																[{entry.action || entry.type}] {entry.resource}
															</span>
														</li>
													))}
											</ul>
										</div>
									</div>
								</div>
							</div>
						</>
					) : (
						<div className={`rounded-xl border p-6 text-sm ${panelClasses}`}>
							<p className={mutedText}>
								Paste JSON input and click Compare to view intersection and differences.
							</p>
						</div>
					)}
				</section>
			</div>
		</div>
	);
};
