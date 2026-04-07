import type { FC } from "react";
import { useState } from "react";
import { useSwaggerMinifier } from "../hooks/useSwaggerMinifier";
import { listSnapshots } from "../utils/swaggerSavedSnapshotsStorage";
import { SwaggerComparePanel } from "./swagger-compare/SwaggerComparePanel";
import SwaggerMinifier from "./swagger-minifier/SwaggerMinifier";

type TabId = "minifier" | "compare";

type SwaggerWorkspaceProps = {
	className?: string;
};

export const SwaggerWorkspace: FC<SwaggerWorkspaceProps> = ({ className = "" }) => {
	const m = useSwaggerMinifier("");
	const [activeTab, setActiveTab] = useState<TabId>("minifier");
	const [snapshots, setSnapshots] = useState(() => listSnapshots());

	const refreshSnapshots = () => {
		setSnapshots(listSnapshots());
	};

	return (
		<div
			className={`w-full overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/80 text-slate-100 shadow-glow backdrop-blur ${className}`}
		>
			<header className="border-b border-slate-700/70 bg-slate-900/80 px-4 py-4 lg:px-6">
				<h1 className="text-lg font-semibold tracking-tight text-slate-100">Swagger Minifier</h1>
				<p className="mt-1 text-sm text-slate-400">
					Select only the endpoints you need, save snapshots, and compare API shapes between
					versions.
				</p>
				<nav className="mt-4 flex gap-2" aria-label="Workspace">
					<button
						type="button"
						onClick={() => setActiveTab("minifier")}
						className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
							activeTab === "minifier"
								? "bg-accent/20 text-accent ring-1 ring-accent/50"
								: "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
						}`}
					>
						Minifier
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("compare")}
						className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
							activeTab === "compare"
								? "bg-accent/20 text-accent ring-1 ring-accent/50"
								: "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
						}`}
					>
						Compare
					</button>
				</nav>
			</header>

			{activeTab === "minifier" ? (
				<SwaggerMinifier
					embedded
					m={m}
					onSnapshotSaved={refreshSnapshots}
				/>
			) : null}

			{activeTab === "compare" ? (
				<div className="p-4 lg:p-6">
					<SwaggerComparePanel
						snapshots={snapshots}
						onSnapshotsChange={refreshSnapshots}
						onLoadSnapshot={(rawJson) => {
							m.setRawJson(rawJson);
						}}
						onSwitchToMinifier={() => setActiveTab("minifier")}
					/>
				</div>
			) : null}
		</div>
	);
};
