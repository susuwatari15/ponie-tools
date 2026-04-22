import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SwaggerComparePanel } from "./swagger-compare/SwaggerComparePanel";
import type { SavedSnapshot } from "../utils/swaggerSavedSnapshotsStorage";
import { listSnapshots } from "../utils/swaggerSavedSnapshotsStorage";
import { writeRawJsonToStorage } from "../utils/swaggerRawJsonStorage";

export const SwaggerCompareWorkspace: FC = () => {
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
		<div className="w-full overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4 text-slate-100 shadow-glow backdrop-blur lg:p-6">
			<div className="mb-5">
				<h1 className="text-lg font-semibold tracking-tight text-slate-100">
					Swagger Compare
				</h1>
				<p className="mt-1 text-sm text-slate-400">
					Compare two saved snapshots to see added, removed, and changed endpoints.
				</p>
			</div>

			<SwaggerComparePanel
				snapshots={snapshots}
				onSnapshotsChange={refreshSnapshots}
				onLoadSnapshot={handleLoadSnapshot}
				onSwitchToMinifier={() => navigate("/")}
			/>
		</div>
	);
};
