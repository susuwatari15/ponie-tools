"use client";

import type { FC } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PermissionDiffViewer } from "./_components/PermissionDiffViewer";

const PermissionDiffPage: FC = () => {
	return (
		<div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
			<PageHeader
				eyebrow="// permissions · diff"
				title="Permission Diff Viewer"
				description="Compare permissions across two role groups from raw JSON."
			/>
			<PermissionDiffViewer />
		</div>
	);
};

export default PermissionDiffPage;
