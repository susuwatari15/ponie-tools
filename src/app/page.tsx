"use client";

import { ArrowRight, Layers } from "lucide-react";
import Link from "next/link";
import type { FC } from "react";
import { HOME_NAV_ITEM, TOOL_NAV_ITEMS } from "@/components/layout/constants/nav-items";
import { Skeleton } from "@/components/ui/Skeleton";
import { RecentActivity } from "./_home/components/RecentActivity";
import { ToolCardGroups } from "./_home/components/ToolCardGroups";
import { useHomeActivity } from "./_home/hooks/useHomeActivity";

const HomePage: FC = () => {
	const m = useHomeActivity();
	const lastTool = TOOL_NAV_ITEMS.find((item) => item.href === m.lastVisited?.href);
	const cta = lastTool ?? TOOL_NAV_ITEMS[0] ?? HOME_NAV_ITEM;

	return (
		<div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
			{/* Hero */}
			<section className="relative overflow-hidden rounded-card border border-line bg-surface p-6 shadow-card sm:p-9">
				<div className="method-spectrum absolute inset-x-0 top-0 h-1 opacity-90" aria-hidden />
				<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">ponie/tools</p>
				<h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-fg sm:text-4xl">
					A terminal-native toolkit for <span className="text-accent">OpenAPI specs</span>,
					permissions and everyday dev conversions.
				</h1>
				<p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
					Minify a swagger doc to just the endpoints you need, diff snapshots down to the operation
					and compare permission sets across role groups — plus quick JSON formatting, epoch
					timestamps and px ↔ rem. Everything runs in your browser.
				</p>
				<div className="mt-6 flex flex-wrap items-center gap-3">
					<Link
						href={cta.href}
						className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90"
					>
						{lastTool ? `Continue in ${lastTool.label}` : `Open ${cta.label}`}
						<ArrowRight className="h-4 w-4" />
					</Link>
					<div className="inline-flex items-center gap-2 font-mono text-xs text-muted">
						<Layers className="h-4 w-4" aria-hidden />
						{m.loaded ? (
							`${m.snapshotCount} saved snapshot${m.snapshotCount === 1 ? "" : "s"}`
						) : (
							<>
								<Skeleton className="h-3 w-28" />
								<span className="sr-only">Loading snapshots</span>
							</>
						)}
					</div>
				</div>
			</section>

			<RecentActivity m={m} />

			<ToolCardGroups />
		</div>
	);
};

export default HomePage;
