"use client";

import type { FC } from "react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { SwaggerComparePanel } from "./_components/SwaggerComparePanel";
import type { SavedSnapshot } from "@/lib/swaggerSavedSnapshotsStorage";
import { listSnapshots } from "@/lib/swaggerSavedSnapshotsStorage";
import { writeRawJsonToStorage } from "@/lib/swaggerRawJsonStorage";

const SwaggerCompareContent: FC = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [snapshots, setSnapshots] = useState<SavedSnapshot[]>([]);

	const initialSnapshotIdA = searchParams.get("a") ?? "";
	const initialSnapshotIdB = searchParams.get("b") ?? "";

	const refreshSnapshots = useCallback(() => {
		void listSnapshots().then(setSnapshots);
	}, []);

	useEffect(() => {
		refreshSnapshots();
	}, [refreshSnapshots]);

	const handleLoadSnapshot = (rawJson: string) => writeRawJsonToStorage(rawJson);

	return (
		<div className="mx-auto flex h-full w-full max-w-[1600px] flex-col gap-5 p-4 sm:p-6">
			<PageHeader
				eyebrow="// swagger · diff"
				title="Swagger Compare"
				description="Compare two saved snapshots to see added, removed, and changed endpoints."
			/>

			<SwaggerComparePanel
				className="min-h-0 flex-1"
				snapshots={snapshots}
				onSnapshotsChange={refreshSnapshots}
				onLoadSnapshot={handleLoadSnapshot}
				onSwitchToMinifier={() => router.push("/minifier")}
				initialSnapshotIdA={initialSnapshotIdA}
				initialSnapshotIdB={initialSnapshotIdB}
			/>
		</div>
	);
};

export default function SwaggerComparePage() {
	return (
		<Suspense>
			<SwaggerCompareContent />
		</Suspense>
	);
}
