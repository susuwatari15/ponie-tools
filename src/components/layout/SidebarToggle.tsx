"use client";

import { PanelLeft } from "lucide-react";
import type { FC } from "react";
import { useSidebar } from "./SidebarProvider";

export const SidebarToggle: FC = () => {
	const { collapsed, toggleSidebar } = useSidebar();

	return (
		<button
			type="button"
			onClick={toggleSidebar}
			aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
			aria-pressed={!collapsed}
			title={`${collapsed ? "Show" : "Hide"} sidebar (⌘/Ctrl + B)`}
			className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
		>
			<PanelLeft className="h-4 w-4 shrink-0" aria-hidden />
			<span className="hidden sm:inline">Sidebar</span>
		</button>
	);
};
