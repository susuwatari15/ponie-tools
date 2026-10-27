"use client";

import type { FC } from "react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getLatestTwoSnapshotIdsForCompare } from "@/lib/swaggerSavedSnapshotsStorage";
import SwaggerMinifier from "../_swagger-minifier/components/SwaggerMinifier";
import { useMinifierCommands } from "../_swagger-minifier/hooks/useMinifierCommands";
import {
	type SwaggerMinifierSharedLink,
	useSwaggerMinifier,
} from "../_swagger-minifier/hooks/useSwaggerMinifier";

const SwaggerMinifierContent: FC = () => {
	const router = useRouter();
	const searchParams = useSearchParams();

	// A shared `?p=&sel=` link (or the command bar's `?p=&fetch=1`) is read once;
	// the controller applies it over the persisted state, and the params are
	// then dropped from the address bar.
	const [sharedLink] = useState<SwaggerMinifierSharedLink>(() => ({
		profileId: searchParams.get("p"),
		selectionCode: searchParams.get("sel"),
		autoFetch: searchParams.get("fetch") === "1",
	}));
	const m = useSwaggerMinifier("", sharedLink);

	useEffect(() => {
		if (sharedLink.profileId || sharedLink.selectionCode || sharedLink.autoFetch) {
			router.replace("/minifier", { scroll: false });
		}
	}, [router, sharedLink]);

	const handleCompareToLatestVersion = async () => {
		const pair = await getLatestTwoSnapshotIdsForCompare();
		if (pair) {
			router.push(`/swagger-compare?a=${pair.versionA}&b=${pair.versionB}`);
		} else {
			router.push("/swagger-compare");
		}
	};

	useMinifierCommands(m, { onCompareLatest: handleCompareToLatestVersion });

	return (
		<div className="mx-auto flex h-full w-full flex-col gap-5 p-4 sm:p-6">
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

export default function SwaggerMinifierPage() {
	return (
		<Suspense>
			<SwaggerMinifierContent />
		</Suspense>
	);
}
