"use client";

import type { FC } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EpochConverter } from "./_components/EpochConverter";
import { useEpochConverter } from "./_hooks/useEpochConverter";

const EpochConverterPage: FC = () => {
	const m = useEpochConverter();

	return (
		<div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
			<PageHeader
				eyebrow="// time · unix"
				title="Epoch Converter"
				description="Convert between Unix timestamps and human-readable UTC / local dates."
			/>
			<EpochConverter m={m} />
		</div>
	);
};

export default EpochConverterPage;
