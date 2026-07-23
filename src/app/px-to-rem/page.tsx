"use client";

import type { FC } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PxRemConverter } from "./_components/PxRemConverter";
import { usePxRem } from "./_hooks/usePxRem";

const PxRemPage: FC = () => {
	const m = usePxRem();

	return (
		<div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
			<PageHeader
				eyebrow="// css · units"
				title="PX ↔ REM Converter"
				description="Convert pixels to rem and back against a configurable root font size."
			/>
			<PxRemConverter m={m} />
		</div>
	);
};

export default PxRemPage;
