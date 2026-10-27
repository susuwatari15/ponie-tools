import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Download, GitCompare, History, Layers } from "lucide-react";
import Link from "next/link";
import type { FC, ReactNode } from "react";
import { WORKSPACE_NAV_ITEMS } from "@/components/layout/constants/nav-items";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import type { HomeActivityController } from "../hooks/useHomeActivity";

const linkClass =
	"inline-flex items-center gap-1.5 font-mono text-xs font-medium text-accent transition hover:text-accent/80";

const ago = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });

const Empty: FC<{ children: ReactNode }> = ({ children }) => (
	<p className="text-sm text-muted">{children}</p>
);

const ContinueCard: FC<{ m: HomeActivityController }> = ({ m }) => {
	const tool = m.lastVisited
		? WORKSPACE_NAV_ITEMS.find((item) => item.href === m.lastVisited?.href)
		: undefined;
	const Icon = tool?.icon ?? History;

	return (
		<Card flush>
			<CardHeader eyebrow="// continue" title="Where you left off" />
			<div className="p-4">
				{tool && m.lastVisited ? (
					<Link href={tool.href} className="group flex items-center gap-3">
						<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-raised text-accent">
							<Icon className="h-4 w-4" aria-hidden />
						</span>
						<span className="min-w-0 flex-1">
							<span className="block truncate text-sm font-medium text-fg group-hover:text-accent">
								{tool.label}
							</span>
							<span className="block text-xs text-muted">{ago(m.lastVisited.visitedAt)}</span>
						</span>
						<ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" />
					</Link>
				) : (
					<Empty>No tool opened yet — pick one below.</Empty>
				)}
			</div>
		</Card>
	);
};

const ActiveProfileCard: FC<{ m: HomeActivityController }> = ({ m }) => {
	const profile = m.activeProfile;
	return (
		<Card flush>
			<CardHeader eyebrow="// profile" title="Active profile" />
			<div className="space-y-3 p-4">
				{profile ? (
					<>
						<div className="flex items-center gap-2.5">
							<span
								className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/10"
								style={{ backgroundColor: profile.color }}
								aria-hidden
							/>
							<span className="min-w-0">
								<span className="block truncate text-sm font-medium text-fg">{profile.name}</span>
								<span className="block truncate text-xs text-muted">
									{profile.url || "No Swagger URL set"}
								</span>
							</span>
						</div>
						{profile.url ? (
							<Link
								href={`/minifier?p=${encodeURIComponent(profile.id)}&fetch=1`}
								className={linkClass}
							>
								<Download className="h-3.5 w-3.5" aria-hidden />
								Fetch in the Minifier
							</Link>
						) : null}
					</>
				) : (
					<Empty>
						None selected.{" "}
						<Link href="/minifier" className="text-accent hover:underline">
							Set one up in the Minifier
						</Link>{" "}
						to fetch specs from a URL.
					</Empty>
				)}
			</div>
		</Card>
	);
};

const RecentSnapshotsCard: FC<{ m: HomeActivityController }> = ({ m }) => {
	const [latest, previous] = m.recentSnapshots;
	return (
		<Card flush className="lg:col-span-2">
			<CardHeader
				eyebrow="// snapshots"
				title="Recent snapshots"
				description={
					m.snapshotCount > m.recentSnapshots.length
						? `Latest ${m.recentSnapshots.length} of ${m.snapshotCount}`
						: undefined
				}
				actions={
					latest && previous ? (
						<Link
							href={`/swagger-compare?a=${encodeURIComponent(previous.id)}&b=${encodeURIComponent(latest.id)}`}
							className={linkClass}
						>
							<GitCompare className="h-3.5 w-3.5" aria-hidden />
							Compare latest two
						</Link>
					) : undefined
				}
			/>
			{m.recentSnapshots.length > 0 ? (
				<ul className="divide-y divide-line">
					{m.recentSnapshots.map((snap) => (
						<li key={snap.id}>
							<Link
								href={`/swagger-compare?a=${encodeURIComponent(snap.id)}`}
								className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-raised"
							>
								<Layers className="h-4 w-4 shrink-0 text-muted" aria-hidden />
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm text-fg group-hover:text-accent">
										{snap.name}
									</span>
									<span className="flex items-center gap-1.5 text-xs text-muted">
										{snap.profileColor ? (
											<span
												className="h-2 w-2 shrink-0 rounded-full"
												style={{ backgroundColor: snap.profileColor }}
												aria-hidden
											/>
										) : null}
										{snap.profileName ? `${snap.profileName} · ` : ""}
										{ago(snap.createdAt)}
									</span>
								</span>
								<ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" />
							</Link>
						</li>
					))}
				</ul>
			) : (
				<div className="p-4">
					<Empty>
						No snapshots yet. Save one from the Minifier to diff versions in{" "}
						<Link href="/swagger-compare" className="text-accent hover:underline">
							Swagger Compare
						</Link>
						.
					</Empty>
				</div>
			)}
		</Card>
	);
};

const ActivitySkeleton: FC = () => (
	<SkeletonGroup label="Loading recent activity" className="grid gap-4 lg:grid-cols-3">
		<div className="space-y-4">
			<Skeleton className="h-28 rounded-card" />
			<Skeleton className="h-32 rounded-card" />
		</div>
		<Skeleton className="h-64 rounded-card lg:col-span-2" />
	</SkeletonGroup>
);

export const RecentActivity: FC<{ m: HomeActivityController }> = ({ m }) => (
	<section aria-labelledby="home-activity">
		<h2
			id="home-activity"
			className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted"
		>
			Recent activity
		</h2>
		{m.loaded ? (
			<div className="grid gap-4 lg:grid-cols-3">
				<div className="space-y-4">
					<ContinueCard m={m} />
					<ActiveProfileCard m={m} />
				</div>
				<RecentSnapshotsCard m={m} />
			</div>
		) : (
			<ActivitySkeleton />
		)}
	</section>
);
