import { Download, ShieldAlert } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type { SettingsController } from "../_hooks/useSettings";

export const BackupCard: FC<{ m: SettingsController }> = ({ m }) => (
	<Card flush>
		<CardHeader
			eyebrow="// backup"
			title="Download a backup"
			description="Profiles, snapshots, the Minifier draft, selections, presets and preferences — as one JSON file."
		/>
		<div className="space-y-3 p-4">
			<label className="flex items-start gap-2 text-sm text-fg">
				<input
					type="checkbox"
					checked={m.includePasswords}
					onChange={(event) => m.setIncludePasswords(event.target.checked)}
					className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-accent focus:ring-accent"
				/>
				<span>
					Include profile passwords
					<span className="block text-xs text-muted">
						Off by default. Passwords set to “ask each session” are never included.
					</span>
				</span>
			</label>

			{m.includePasswords ? (
				<p className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-700 dark:text-amber-300">
					<ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
					The file will contain passwords in plain text. Store it somewhere private and don&apos;t
					share it.
				</p>
			) : null}

			<Button
				variant="primary"
				onClick={m.downloadBackup}
				disabled={m.exporting}
				leftIcon={
					m.exporting ? <Spinner className="text-white" /> : <Download className="h-4 w-4" />
				}
			>
				Download backup
			</Button>
		</div>
	</Card>
);
