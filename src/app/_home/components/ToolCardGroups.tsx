import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { FC } from "react";
import { TOOL_NAV_GROUPS } from "@/components/layout/constants/nav-items";

/** Every tool as a card, in the sidebar's labelled groups (API tools, Utilities). */
export const ToolCardGroups: FC = () => (
	<div className="space-y-6">
		{TOOL_NAV_GROUPS.map((group) => (
			<section key={group.label} aria-labelledby={`tools-${group.label}`}>
				<h2
					id={`tools-${group.label}`}
					className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted"
				>
					{group.label}
				</h2>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{group.items.map(({ href, label, description, icon: Icon }) => (
						<Link
							key={href}
							href={href}
							className="group flex flex-col rounded-card border border-line bg-surface p-5 shadow-card transition hover:border-accent/40 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
						>
							<span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-raised text-accent">
								<Icon className="h-5 w-5" aria-hidden />
							</span>
							<h3 className="mt-4 text-base font-semibold text-fg">{label}</h3>
							<p className="mt-1 flex-1 text-sm text-muted">{description}</p>
							<span className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs font-medium text-accent">
								Open
								<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
							</span>
						</Link>
					))}
				</div>
			</section>
		))}
	</div>
);
