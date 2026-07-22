"use client";

import { ArrowRight, Layers } from "lucide-react";
import Link from "next/link";
import { type FC, useEffect, useState } from "react";
import { TOOL_NAV_ITEMS } from "@/components/layout/constants/nav-items";
import { listSnapshots } from "@/lib/swaggerSavedSnapshotsStorage";

const HomePage: FC = () => {
	const [snapshotCount, setSnapshotCount] = useState<number | null>(null);

	useEffect(() => {
		let alive = true;
		void listSnapshots().then((snaps) => {
			if (alive) setSnapshotCount(snaps.length);
		});
		return () => {
			alive = false;
		};
	}, []);

	return (
		<div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
			{/* Hero */}
			<section className="relative overflow-hidden rounded-card border border-line bg-surface p-6 shadow-card sm:p-9">
				<div className="method-spectrum absolute inset-x-0 top-0 h-1 opacity-90" aria-hidden />
				<p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
					ponie/tools
				</p>
				<h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-fg sm:text-4xl">
					A terminal-native toolkit for{" "}
					<span className="text-accent">OpenAPI specs</span> and permissions.
				</h1>
				<p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
					Minify a swagger doc to just the endpoints you need, diff two snapshots
					down to the operation, and compare permission sets across role groups —
					all in the browser.
				</p>
				<div className="mt-6 flex flex-wrap items-center gap-3">
					<Link
						href="/minifier"
						className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90"
					>
						Open Swagger Minifier
						<ArrowRight className="h-4 w-4" />
					</Link>
					<span className="inline-flex items-center gap-2 font-mono text-xs text-muted">
						<Layers className="h-4 w-4" />
						{snapshotCount === null
							? "loading snapshots…"
							: `${snapshotCount} saved snapshot${snapshotCount === 1 ? "" : "s"}`}
					</span>
				</div>
			</section>

			{/* Tool cards */}
			<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{TOOL_NAV_ITEMS.map(({ href, label, description, icon: Icon }) => (
					<Link
						key={href}
						href={href}
						className="group flex flex-col rounded-card border border-line bg-surface p-5 shadow-card transition hover:border-accent/40 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
					>
						<span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-raised text-accent">
							<Icon className="h-5 w-5" aria-hidden />
						</span>
						<h2 className="mt-4 text-base font-semibold text-fg">{label}</h2>
						<p className="mt-1 flex-1 text-sm text-muted">{description}</p>
						<span className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs font-medium text-accent">
							Open
							<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
						</span>
					</Link>
				))}
			</div>
		</div>
	);
};

export default HomePage;
