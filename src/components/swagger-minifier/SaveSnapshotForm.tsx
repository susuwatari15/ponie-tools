import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Check, RefreshCw, Save } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { parseOpenApiInput } from "../../utils/openApiInput";
import { addSnapshot } from "../../utils/swaggerSavedSnapshotsStorage";
import { writeRawJsonToStorage } from "../../utils/swaggerRawJsonStorage";

const snapshotSchema = z.object({
	name: z.string().min(1, "Name is required.").max(120, "Name is too long."),
});

type SnapshotFormValues = z.infer<typeof snapshotSchema>;

type SaveSnapshotFormProps = {
	rawJson: string;
	onSaved?: () => void;
};

export const SaveSnapshotForm: FC<SaveSnapshotFormProps> = ({ rawJson, onSaved }) => {
	const form = useForm<SnapshotFormValues>({
		resolver: zodResolver(snapshotSchema),
		defaultValues: {
			name: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
		},
	});

	const [saved, setSaved] = useState(false);
	const [submitError, setSubmitError] = useState<string>("");

	function submit(values: SnapshotFormValues) {
		const parsed = parseOpenApiInput(rawJson);
		if (parsed.error || !parsed.doc) {
			setSubmitError(parsed.error || "Invalid OpenAPI JSON.");
			return;
		}

		const result = addSnapshot({ name: values.name, rawJson });
		if (!result.ok) {
			const message =
				result.error === "quota"
					? "Browser storage is full. Remove old snapshots or use a smaller spec."
					: "Could not save snapshot.";
			setSubmitError(message);
			return;
		}

		try {
			writeRawJsonToStorage(rawJson);
		} catch {
			// snapshot already stored; draft optional
		}

		setSubmitError("");
		setSaved(true);
		onSaved?.();
		window.setTimeout(() => setSaved(false), 1500);
	}

	const renewName = () => {
		const next = format(new Date(), "yyyy-MM-dd HH:mm:ss");
		form.setValue("name", next, { shouldValidate: true, shouldDirty: true });
		form.clearErrors("name");
	};

	return (
		<form
			className="mt-2 flex flex-col gap-2"
			onSubmit={form.handleSubmit((values) => {
				submit(values);
			})}
		>
			<div className="flex flex-wrap items-end gap-2">
				<label className="flex min-w-[200px] flex-1 flex-col gap-1">
					<span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
						Snapshot name
					</span>
					<div className="flex min-h-[2.125rem] min-w-0 overflow-hidden rounded-md border border-slate-700 bg-slate-950/90 transition focus-within:border-accent">
						<input
							type="text"
							{...form.register("name")}
							className="min-w-0 flex-1 border-0 bg-transparent px-2 py-1.5 font-mono text-xs text-slate-200 outline-none ring-0"
							autoComplete="off"
						/>
						<button
							type="button"
							onClick={renewName}
							title="Set name to current date and time"
							className="inline-flex shrink-0 items-center gap-1 border-l border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-[10px] font-medium text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
						>
							<RefreshCw className="h-3.5 w-3.5" aria-hidden />
							Renew
						</button>
					</div>
				</label>
				<button
					type="submit"
					className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 transition hover:border-slate-400"
				>
					{saved ? (
						<Check className="h-4 w-4 text-emerald-300" />
					) : (
						<Save className="h-4 w-4" />
					)}
					{saved ? "Saved" : "Save snapshot"}
				</button>
			</div>
			{form.formState.errors.name?.message ? (
				<p className="text-xs text-amber-300">{form.formState.errors.name.message}</p>
			) : null}
			{submitError ? <p className="text-xs text-amber-300">{submitError}</p> : null}
		</form>
	);
};
