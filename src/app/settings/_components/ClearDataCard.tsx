import { Trash2 } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import type { SettingsController } from "../_hooks/useSettings";

export const ClearDataCard: FC<{ m: SettingsController }> = ({ m }) => (
	<Card flush className="border-del/30">
		<CardHeader
			eyebrow="// danger zone"
			title="Clear all data"
			description="Deletes every snapshot, profile, draft, selection and preset stored by Ponie Tools in this browser. Theme and panel sizes are kept."
		/>
		<div className="p-4">
			<Button variant="danger" onClick={m.openClear} leftIcon={<Trash2 className="h-4 w-4" />}>
				Clear all data…
			</Button>
		</div>
		<Modal
			open={m.isClearOpen}
			onClose={m.closeClear}
			eyebrow="// danger zone"
			title="Clear all stored data?"
			footer={
				<>
					<Button variant="ghost" onClick={m.closeClear}>
						Cancel
					</Button>
					<Button
						variant="danger"
						onClick={m.clearData}
						disabled={m.clearing}
						leftIcon={
							m.clearing ? <Spinner className="text-current" /> : <Trash2 className="h-4 w-4" />
						}
					>
						Delete everything
					</Button>
				</>
			}
		>
			<p className="text-sm text-muted">
				{m.summary
					? `${m.summary.snapshots} snapshot${m.summary.snapshots === 1 ? "" : "s"}, ${m.summary.profiles} profile${m.summary.profiles === 1 ? "" : "s"} and ${m.summary.presets} preset${m.summary.presets === 1 ? "" : "s"} will be deleted. `
					: ""}
				This can&apos;t be undone — download a backup first if you might need them.
			</p>
		</Modal>
	</Card>
);
