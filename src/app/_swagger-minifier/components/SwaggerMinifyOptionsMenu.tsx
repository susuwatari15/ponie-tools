"use client";

import { SlidersHorizontal } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Popover } from "@/components/ui/Popover";
import { DEFAULT_MINIFY_OPTIONS, type MinifyOptions } from "@/lib/swaggerMinifier";

const OPTIONS: { key: keyof MinifyOptions; label: string; hint: string }[] = [
	{
		key: "stripDescriptions",
		label: "Strip descriptions",
		hint: "Drop operation, field and scheme descriptions; summaries stay.",
	},
	{ key: "stripExamples", label: "Strip examples", hint: "Drop `example` values." },
	{
		key: "dropDeprecated",
		label: "Drop deprecated",
		hint: "Skip deprecated operations, parameters and properties.",
	},
	{
		key: "inlineRefs",
		label: "Inline $refs",
		hint: "Off: keep { $ref } and list each schema once under `schemas`.",
	},
	{
		key: "keepSecuritySchemes",
		label: "Keep security",
		hint: "Add each operation's `security` and the schemes it uses.",
	},
];

type SwaggerMinifyOptionsMenuProps = {
	options: MinifyOptions;
	onChange: (options: MinifyOptions) => void;
};

export const SwaggerMinifyOptionsMenu: FC<SwaggerMinifyOptionsMenuProps> = ({
	options,
	onChange,
}) => {
	const changed = OPTIONS.filter(({ key }) => options[key] !== DEFAULT_MINIFY_OPTIONS[key]).length;

	return (
		<Popover
			label="Minify options"
			trigger={({ triggerProps }) => (
				<Button
					size="sm"
					leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
					{...triggerProps}
				>
					Options
					{changed > 0 ? (
						<span className="rounded bg-accent/15 px-1 font-mono text-[10px] text-accent">
							{changed}
						</span>
					) : null}
				</Button>
			)}
		>
			{() => (
				<>
					<ul className="space-y-0.5">
						{OPTIONS.map(({ key, label, hint }) => (
							<li key={key}>
								<label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 transition hover:bg-raised">
									<input
										type="checkbox"
										checked={options[key]}
										onChange={(event) => onChange({ ...options, [key]: event.target.checked })}
										className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-accent focus:ring-accent"
									/>
									<span className="min-w-0">
										<span className="block text-xs font-medium text-fg">{label}</span>
										<span className="block text-[11px] leading-snug text-muted">{hint}</span>
									</span>
								</label>
							</li>
						))}
					</ul>
					<div className="mt-1.5 flex justify-end border-t border-line pt-1.5">
						<button
							type="button"
							onClick={() => onChange(DEFAULT_MINIFY_OPTIONS)}
							disabled={changed === 0}
							className={cn(
								"rounded px-2 py-1 text-[11px] font-medium text-accent transition hover:bg-accent/10",
								"disabled:cursor-not-allowed disabled:text-muted/50 disabled:hover:bg-transparent",
							)}
						>
							Reset to defaults
						</button>
					</div>
				</>
			)}
		</Popover>
	);
};
