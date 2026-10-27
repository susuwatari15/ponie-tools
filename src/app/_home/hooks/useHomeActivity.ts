import { useEffect, useState } from "react";
import { type LastVisitedTool, readLastVisitedTool } from "@/lib/lastVisitedToolStorage";
import {
	listProfiles,
	readSelectedProfileId,
	type SwaggerProfile,
} from "@/lib/swaggerProfilesStorage";
import { listSnapshots, type SavedSnapshot } from "@/lib/swaggerSavedSnapshotsStorage";

const RECENT_SNAPSHOT_COUNT = 5;

/** Home's "recent activity": latest snapshots, the active profile and the last tool used. */
export function useHomeActivity() {
	const [loaded, setLoaded] = useState(false);
	const [snapshotCount, setSnapshotCount] = useState(0);
	const [recentSnapshots, setRecentSnapshots] = useState<SavedSnapshot[]>([]);
	const [activeProfile, setActiveProfile] = useState<SwaggerProfile | null>(null);
	const [lastVisited, setLastVisited] = useState<LastVisitedTool | null>(null);

	useEffect(() => {
		let alive = true;
		void Promise.all([
			listSnapshots(),
			listProfiles(),
			readSelectedProfileId(),
			readLastVisitedTool(),
		]).then(([snapshots, profiles, selectedId, last]) => {
			if (!alive) return;
			setSnapshotCount(snapshots.length);
			setRecentSnapshots(snapshots.slice(0, RECENT_SNAPSHOT_COUNT));
			setActiveProfile(profiles.find((profile) => profile.id === selectedId) ?? null);
			setLastVisited(last);
			setLoaded(true);
		});
		return () => {
			alive = false;
		};
	}, []);

	return { loaded, snapshotCount, recentSnapshots, activeProfile, lastVisited };
}

export type HomeActivityController = ReturnType<typeof useHomeActivity>;
