import type { FC } from "react";

type InputMode = "manual" | "url";

type SwaggerInputModeToggleProps = {
	inputMode: InputMode;
	onModeChange: (mode: InputMode) => void;
};

export const SwaggerInputModeToggle: FC<SwaggerInputModeToggleProps> = ({
	inputMode,
	onModeChange,
}) => (
	<div className="mb-3 flex gap-2">
		<button
			type="button"
			onClick={() => onModeChange("manual")}
			className={`rounded-md border px-3 py-1.5 text-xs transition ${
				inputMode === "manual"
					? "border-accent/70 bg-accent/15 text-sky-200"
					: "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
			}`}
		>
			Paste / Upload
		</button>
		<button
			type="button"
			onClick={() => onModeChange("url")}
			className={`rounded-md border px-3 py-1.5 text-xs transition ${
				inputMode === "url"
					? "border-accent/70 bg-accent/15 text-sky-200"
					: "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
			}`}
		>
			Fetch from URL
		</button>
	</div>
);
