"use client";

import type { FC } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BackupCard } from "./_components/BackupCard";
import { ClearDataCard } from "./_components/ClearDataCard";
import { RestoreCard } from "./_components/RestoreCard";
import { StorageCard } from "./_components/StorageCard";
import { useSettings } from "./_hooks/useSettings";

const SettingsPage: FC = () => {
	const m = useSettings();

	return (
		<div className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
			<PageHeader
				eyebrow="// settings · data"
				title="Settings & data"
				description="Back up, restore or clear what Ponie Tools keeps in this browser."
			/>
			<StorageCard m={m} />
			<div className="grid gap-5 md:grid-cols-2">
				<BackupCard m={m} />
				<RestoreCard m={m} />
			</div>
			<ClearDataCard m={m} />
		</div>
	);
};

export default SettingsPage;
