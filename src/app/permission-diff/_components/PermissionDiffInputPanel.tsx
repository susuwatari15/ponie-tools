import { FlaskConical, GitCompare } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";

type PermissionDiffInputPanelProps = {
	group1RawJson: string;
	group2RawJson: string;
	error: string | null;
	onGroup1Change: (value: string) => void;
	onGroup2Change: (value: string) => void;
	onCompare: () => void;
	onLoadSample: () => void;
};

const labelClass = "font-mono text-[10px] uppercase tracking-widest text-muted";

export const PermissionDiffInputPanel: FC<PermissionDiffInputPanelProps> = ({
	group1RawJson,
	group2RawJson,
	error,
	onGroup1Change,
	onGroup2Change,
	onCompare,
	onLoadSample,
}) => {
	return (
		<Card className="h-fit space-y-3">
			<p className="font-mono text-[10px] uppercase tracking-widest text-muted">
				// input
			</p>

			<label className="flex flex-col gap-1.5">
				<span className={labelClass}>Group 1 JSON</span>
				<Textarea
					value={group1RawJson}
					onChange={(e) => onGroup1Change(e.target.value)}
					className="h-44 resize-y"
					placeholder='[{"name":"Merchant Admin","permissions":[{"type":"permission","action":"GET","resource":"/api/v1/orders"}]}]'
				/>
			</label>

			<label className="flex flex-col gap-1.5">
				<span className={labelClass}>Group 2 JSON</span>
				<Textarea
					value={group2RawJson}
					onChange={(e) => onGroup2Change(e.target.value)}
					className="h-44 resize-y"
					placeholder='[{"name":"Ops Admin","permissions":[{"type":"permission","action":"GET","resource":"/api/v1/orders"}]}]'
				/>
			</label>

			<div className="flex flex-wrap gap-2">
				<Button
					variant="primary"
					onClick={onCompare}
					leftIcon={<GitCompare className="h-4 w-4" />}
				>
					Compare
				</Button>
				<Button
					onClick={onLoadSample}
					leftIcon={<FlaskConical className="h-4 w-4" />}
				>
					Load sample
				</Button>
			</div>

			{error ? (
				<div className="rounded-lg border border-del/40 bg-del/10 px-3 py-2 text-sm text-del">
					{error}
				</div>
			) : null}
		</Card>
	);
};
