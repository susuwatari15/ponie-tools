"use client";

import { Bookmark, ChevronDown, Trash2 } from "lucide-react";
import { type FC, type FormEvent, type MouseEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Popover } from "@/components/ui/Popover";
import { useToast } from "@/components/ui/ToastProvider";
import type { StorageWriteError } from "@/lib/indexedDb";
import type { SelectionPreset } from "@/lib/swaggerPresetsStorage";
import type { PresetApplyMode } from "../hooks/useSwaggerMinifier";

type SwaggerPresetMenuProps = {
	presets: SelectionPreset[];
	presetMatches: Map<string, number>;
	specKey: string | null;
	selectedCount: number;
	hasSpec: boolean;
	onSavePreset: (
		name: string,
	) => Promise<{ ok: true } | { ok: false; error: StorageWriteError }>;
	onApplyPreset: (
		preset: SelectionPreset,
		mode: PresetApplyMode,
	) => { found: number; total: number };
	onDeletePreset: (id: string) => void;
};

export const SwaggerPresetMenu: FC<SwaggerPresetMenuProps> = ({
	presets,
	presetMatches,
	specKey,
	selectedCount,
	hasSpec,
	onSavePreset,
	onApplyPreset,
	onDeletePreset,
}) => {
	const { toast } = useToast();
	const [name, setName] = useState("");

	// Presets saved from the loaded spec first, then newest first.
	const ordered = useMemo(
		() =>
			[...presets].sort((a, b) => {
				const aMatch = a.specKey === specKey ? 0 : 1;
				const bMatch = b.specKey === specKey ? 0 : 1;
				return aMatch - bMatch || b.createdAt - a.createdAt;
			}),
		[presets, specKey],
	);

	const save = async (event: FormEvent) => {
		event.preventDefault();
		if (!name.trim() || selectedCount === 0) return;
		const result = await onSavePreset(name);
		if (result.ok) {
			setName("");
			toast("Preset saved", "success");
		} else {
			toast(
				result.error === "quota" ? "Browser storage is full." : "Could not save preset.",
				"error",
			);
		}
	};

	const apply = (preset: SelectionPreset, event: MouseEvent, close: () => void) => {
		const mode: PresetApplyMode = event.shiftKey ? "merge" : "replace";
		const { found, total } = onApplyPreset(preset, mode);
		toast(
			`${mode === "merge" ? "Merged" : "Applied"} “${preset.name}” — ${found}/${total} found`,
			found === total ? "success" : "info",
		);
		close();
	};

	return (
		<Popover
			label="Selection presets"
			trigger={({ triggerProps }) => (
				<Button
					size="sm"
					variant="ghost"
					leftIcon={<Bookmark className="h-3.5 w-3.5" />}
					rightIcon={<ChevronDown className="h-3 w-3" />}
					{...triggerProps}
				>
					Presets
				</Button>
			)}
		>
			{(close) => (
				<>
					<form onSubmit={save} className="flex items-center gap-1.5">
						<Input
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder={selectedCount > 0 ? "Preset name…" : "Select endpoints first"}
							disabled={selectedCount === 0}
							aria-label="Preset name"
							className="!py-1.5 !text-xs"
						/>
						<Button
							type="submit"
							size="sm"
							variant="primary"
							disabled={!name.trim() || selectedCount === 0}
						>
							Save
						</Button>
					</form>
					<p className="mt-1 px-0.5 text-[11px] text-muted">
						Saves the {selectedCount} selected endpoint{selectedCount === 1 ? "" : "s"}.
					</p>

					<div className="my-2 h-px bg-line" />

					{ordered.length === 0 ? (
						<p className="px-1 py-3 text-center text-xs text-muted">No presets yet.</p>
					) : (
						<>
							<ul className="scroll-ide max-h-64 space-y-0.5 overflow-y-auto">
								{ordered.map((preset) => {
									const found = presetMatches.get(preset.id) ?? 0;
									const total = preset.endpointIds.length;
									return (
										<li key={preset.id} className="flex items-center gap-1">
											<button
												type="button"
												disabled={!hasSpec || found === 0}
												onClick={(event) => apply(preset, event, close)}
												title="Click to replace the selection · Shift+click to merge"
												className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-raised disabled:cursor-not-allowed disabled:opacity-50"
											>
												<span className="min-w-0 flex-1 truncate text-xs font-medium text-fg">
													{preset.name}
												</span>
												<span
													className={cn(
														"shrink-0 font-mono text-[11px]",
														!hasSpec
															? "text-muted"
															: found === total
																? "text-emerald-600 dark:text-emerald-400"
																: found === 0
																	? "text-del"
																	: "text-put",
													)}
												>
													{hasSpec ? `${found}/${total} found` : `${total}`}
												</span>
											</button>
											<IconButton
												label={`Delete preset ${preset.name}`}
												tone="danger"
												onClick={() => onDeletePreset(preset.id)}
												className="h-7 w-7 border-transparent"
											>
												<Trash2 className="h-3.5 w-3.5" />
											</IconButton>
										</li>
									);
								})}
							</ul>
							<p className="mt-2 px-0.5 text-[11px] text-muted">
								Click to replace · Shift+click to merge
							</p>
						</>
					)}
				</>
			)}
		</Popover>
	);
};
