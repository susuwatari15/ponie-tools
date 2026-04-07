import { Check, Save, Upload } from "lucide-react";
import type { ChangeEvent, FC } from "react";

type SwaggerManualJsonInputProps = {
	rawJson: string;
	onRawJsonChange: (value: string) => void;
	onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
	onSaveToLocalStorage: () => void;
	savedToStorage: boolean;
};

export const SwaggerManualJsonInput: FC<SwaggerManualJsonInputProps> = ({
	rawJson,
	onRawJsonChange,
	onFileUpload,
	onSaveToLocalStorage,
	savedToStorage,
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
			<button
				type="button"
				onClick={onSaveToLocalStorage}
				className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 transition hover:border-slate-400"
			>
				{savedToStorage ? (
					<Check className="h-4 w-4 text-emerald-300" />
				) : (
					<Save className="h-4 w-4" />
				)}
				{savedToStorage ? "Saved" : "Save to browser"}
			</button>
		</div>
	</>
);
