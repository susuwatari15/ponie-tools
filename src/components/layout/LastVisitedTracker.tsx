"use client";

import { usePathname } from "next/navigation";
import { type FC, useEffect } from "react";
import { writeLastVisitedTool } from "@/lib/lastVisitedToolStorage";
import { TOOL_NAV_ITEMS } from "./constants/nav-items";

/** Remembers the last tool page visited; renders nothing. */
export const LastVisitedTracker: FC = () => {
	const pathname = usePathname();

	useEffect(() => {
		const tool = TOOL_NAV_ITEMS.find(
			(item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
		);
		if (tool) void writeLastVisitedTool(tool.href);
	}, [pathname]);

	return null;
};
