"use client";

import type { FC } from "react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { SwaggerComparePanel } from "./_components/SwaggerComparePanel";
import { mutedText, panelClasses, themeClasses } from "./styles";
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
		setSnapshots(listSnapshots());
	}, []);

	useEffect(() => {
		refreshSnapshots();
	}, [refreshSnapshots]);

	const handleLoadSnapshot = (rawJson: string) => {
		writeRawJsonToStorage(rawJson);
	};

	return (
		<div className={`w-full space-y-4 p-4 lg:p-4 ${themeClasses}`}>
			<PageHeader
				title="Swagger Compare"
				titleAs="h1"
				titleClassName="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
				description="Compare two saved snapshots to see added, removed, and changed endpoints."
				descriptionClassName={`text-sm ${mutedText}`}
				wrapperClassName={`rounded-xl border px-4 py-3 ${panelClasses}`}
			/>

			<SwaggerComparePanel
				snapshots={snapshots}
				onSnapshotsChange={refreshSnapshots}
				onLoadSnapshot={handleLoadSnapshot}
				onSwitchToMinifier={() => router.push("/")}
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
