import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import {
	backupFileName,
	clearAllData,
	exportAll,
	getStorageSummary,
	type ImportMode,
	importAll,
	type ParsedBackup,
	readBackupFile,
	type StorageSummary,
} from "@/lib/dataExport";
import { downloadBlob } from "@/lib/downloadFile";

/** A picked backup file awaiting confirmation. */
export type PendingRestore = { fileName: string; parsed: ParsedBackup };

export function useSettings() {
	const { toast } = useToast();
	const [summary, setSummary] = useState<StorageSummary | null>(null);

	const [includePasswords, setIncludePasswords] = useState(false);
	const [exporting, setExporting] = useState(false);

	const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
	const [restoreMode, setRestoreMode] = useState<ImportMode>("merge");
	const [restoring, setRestoring] = useState(false);

	const [isClearOpen, setIsClearOpen] = useState(false);
	const [clearing, setClearing] = useState(false);

	const refreshSummary = useCallback(async () => {
		setSummary(await getStorageSummary());
	}, []);

	useEffect(() => {
		void refreshSummary();
	}, [refreshSummary]);

	const downloadBackup = async () => {
		setExporting(true);
		try {
			downloadBlob(backupFileName(), await exportAll({ includePasswords }));
			toast(
				includePasswords ? "Backup downloaded (with passwords)" : "Backup downloaded",
				"success",
			);
		} catch {
			toast("Couldn't read browser storage for the backup", "error");
		} finally {
			setExporting(false);
		}
	};

	const pickRestoreFile = async (file: File) => {
		setRestoreMode("merge");
		setPendingRestore({ fileName: file.name, parsed: await readBackupFile(file) });
	};

	const cancelRestore = () => setPendingRestore(null);

	const confirmRestore = async () => {
		if (!pendingRestore?.parsed.ok) return;
		setRestoring(true);
		const result = await importAll(pendingRestore.parsed.data, { mode: restoreMode });
		setRestoring(false);
		if (!result.ok) {
			toast(result.error, "error");
			return;
		}
		setPendingRestore(null);
		toast(restoreMode === "replace" ? "Data replaced from backup" : "Backup merged", "success");
		await refreshSummary();
	};

	const clearData = async () => {
		setClearing(true);
		try {
			await clearAllData();
			toast("All stored data cleared", "success");
			setIsClearOpen(false);
		} catch {
			toast("Couldn't clear browser storage", "error");
		} finally {
			setClearing(false);
			await refreshSummary();
		}
	};

	return {
		summary,
		includePasswords,
		setIncludePasswords,
		exporting,
		downloadBackup,
		pendingRestore,
		pickRestoreFile,
		cancelRestore,
		restoreMode,
		setRestoreMode,
		restoring,
		confirmRestore,
		isClearOpen,
		openClear: () => setIsClearOpen(true),
		closeClear: () => setIsClearOpen(false),
		clearing,
		clearData,
	};
}

export type SettingsController = ReturnType<typeof useSettings>;
