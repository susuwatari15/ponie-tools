"use client";

import type { FC } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getLatestTwoSnapshotIdsForCompare } from "@/lib/swaggerSavedSnapshotsStorage";
import SwaggerMinifier from "./_swagger-minifier/components/SwaggerMinifier";
import { useSwaggerMinifier } from "./_swagger-minifier/hooks/useSwaggerMinifier";
import { mutedText, panelClasses, themeClasses } from "./_swagger-minifier/styles";

type SwaggerMinifierPageProps = {
	className?: string;
};

const SwaggerMinifierPage: FC<SwaggerMinifierPageProps> = ({
	className = "",
}) => {
	const m = useSwaggerMinifier("");
	const router = useRouter();

	const handleCompareToLatestVersion = () => {
		const pair = getLatestTwoSnapshotIdsForCompare();
		if (pair) {
			router.push(`/swagger-compare?a=${pair.versionA}&b=${pair.versionB}`);
		} else {
			router.push("/swagger-compare");
		}
	};

	return (
		<div className={`w-full space-y-4 p-4 lg:p-4 ${themeClasses} ${className}`}>
			<PageHeader
				title="Swagger Minifier"
				titleAs="h1"
				titleClassName="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
				description="Select only the endpoints you need and generate a compact, prompt-ready swagger view."
				descriptionClassName={`text-sm ${mutedText}`}
				wrapperClassName={`rounded-xl border px-4 py-3 ${panelClasses}`}
			/>
			<SwaggerMinifier
				embedded
				m={m}
				onNavigateToCompareLatest={handleCompareToLatestVersion}
			/>
		</div>
	);
};

export default SwaggerMinifierPage;
