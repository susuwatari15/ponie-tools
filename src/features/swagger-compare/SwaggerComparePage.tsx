import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { SwaggerComparePanel } from "./components/SwaggerComparePanel";
import type { SavedSnapshot } from "../../utils/swaggerSavedSnapshotsStorage";
import { listSnapshots } from "../../utils/swaggerSavedSnapshotsStorage";
import { writeRawJsonToStorage } from "../../utils/swaggerRawJsonStorage";

export const SwaggerComparePage: FC = () => {
	const navigate = useNavigate();
	const [snapshots, setSnapshots] = useState<SavedSnapshot[]>([]);

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
		<div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-4 text-slate-900 shadow-glow backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100 lg:p-6">
			<PageHeader
				className="mb-5"
				title="Swagger Compare"
				titleAs="h1"
				titleClassName="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
				description="Compare two saved snapshots to see added, removed, and changed endpoints."
				descriptionClassName="mt-1 text-sm text-slate-600 dark:text-slate-400"
			/>

			<SwaggerComparePanel
				snapshots={snapshots}
				onSnapshotsChange={refreshSnapshots}
				onLoadSnapshot={handleLoadSnapshot}
				onSwitchToMinifier={() => navigate("/")}
			/>
		</div>
	);
};
