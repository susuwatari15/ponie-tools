"use client";

import type { FC } from "react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { SwaggerComparePanel } from "./_components/SwaggerComparePanel";
import { useCompareCommands } from "./_hooks/useCompareCommands";
import { useSwaggerCompare } from "./_hooks/useSwaggerCompare";
import { parseFilterParams } from "./_lib/compareFilters";
import { parseSideParam } from "./_lib/compareSources";

const SwaggerCompareContent: FC = () => {
	const searchParams = useSearchParams();
	// `?a=&b=` (snapshot id, `minifier` or `profile:<id>`) and the filter params
	// are read once; the controller then keeps the address bar in sync.
	const [init] = useState(() => ({
		sideA: parseSideParam(searchParams.get("a")),
		sideB: parseSideParam(searchParams.get("b")),
		filters: parseFilterParams(searchParams),
	}));
	const m = useSwaggerCompare(init);
	useCompareCommands(m);

	return (
		<div className="mx-auto flex h-full w-full flex-col gap-5 p-4 sm:p-6">
			<PageHeader
				eyebrow="// swagger · diff"
				title="Swagger Compare"
				description="Compare saved snapshots, live fetches or pasted specs to see added, removed, and changed endpoints."
			/>

			<SwaggerComparePanel className="min-h-0 flex-1" m={m} />
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
