"use client";

import type { FC } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getLatestTwoSnapshotIdsForCompare } from "@/lib/swaggerSavedSnapshotsStorage";
import SwaggerMinifier from "../_swagger-minifier/components/SwaggerMinifier";
import { useSwaggerMinifier } from "../_swagger-minifier/hooks/useSwaggerMinifier";

const SwaggerMinifierPage: FC = () => {
	const m = useSwaggerMinifier("");
	const router = useRouter();

	const handleCompareToLatestVersion = async () => {
		const pair = await getLatestTwoSnapshotIdsForCompare();
		if (pair) {
			router.push(`/swagger-compare?a=${pair.versionA}&b=${pair.versionB}`);
		} else {
			router.push("/swagger-compare");
		}
	};

	return (
		<div className="mx-auto flex h-full w-full max-w-[1600px] flex-col gap-5 p-4 sm:p-6">
			<PageHeader
				eyebrow="// swagger · minify"
				title="Swagger Minifier"
				description="Select only the endpoints you need and generate a compact, prompt-ready swagger view."
			/>
			<SwaggerMinifier
				embedded
				m={m}
				className="min-h-0 flex-1"
				onNavigateToCompareLatest={handleCompareToLatestVersion}
			/>
		</div>
	);
};

export default SwaggerMinifierPage;
