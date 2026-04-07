import { Upload } from "lucide-react";
import type { ChangeEvent, FC } from "react";
import { SaveSnapshotForm } from "./SaveSnapshotForm";

type SwaggerManualJsonInputProps = {
	rawJson: string;
	onRawJsonChange: (value: string) => void;
	onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
	onSnapshotSaved?: () => void;
};

export const SwaggerManualJsonInput: FC<SwaggerManualJsonInputProps> = ({
	rawJson,
	onRawJsonChange,
	onFileUpload,
	onSnapshotSaved,
}) => (
	<>
		<textarea
			value={rawJson}
			onChange={(event) => onRawJsonChange(event.target.value)}
			placeholder="Paste swagger.json here..."
			className="h-36 w-full resize-none rounded-md border border-slate-700 bg-slate-950/90 p-3 font-mono text-xs text-slate-200 outline-none ring-0 transition focus:border-accent"
		/>

		<div className="mt-2 flex flex-wrap items-center gap-2">
			<label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 transition hover:border-slate-400">
				<Upload className="h-4 w-4" />
				Upload JSON
				<input
					type="file"
					accept="application/json,.json"
					onChange={onFileUpload}
					className="hidden"
				/>
			</label>
		</div>

		<SaveSnapshotForm rawJson={rawJson} onSaved={onSnapshotSaved} />
	</>
);
