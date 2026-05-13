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
			className="h-36 w-full resize-none rounded-md border border-slate-300 bg-white p-3 font-mono text-xs text-slate-800 outline-none ring-0 transition focus:border-accent dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-200"
		/>

		<div className="mt-2 flex flex-wrap items-center gap-2">
			<label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-400 bg-slate-100 px-3 py-1.5 text-xs text-slate-800 transition hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-400">
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
