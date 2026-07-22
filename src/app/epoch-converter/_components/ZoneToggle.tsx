import type { FC } from "react";
import { cn } from "@/components/ui";
import type { Zone } from "../_lib/epoch";

type ZoneToggleProps = {
	value: Zone;
	onChange: (zone: Zone) => void;
	/** Accessible group label. */
	label: string;
};

const OPTIONS: { value: Zone; label: string }[] = [
	{ value: "utc", label: "UTC" },
	{ value: "local", label: "Local Time" },
];

/** A two-option segmented control for choosing UTC vs local interpretation. */
export const ZoneToggle: FC<ZoneToggleProps> = ({ value, onChange, label }) => (
	<div
		role="radiogroup"
		aria-label={label}
		className="inline-flex rounded-lg border border-line bg-raised/50 p-0.5"
	>
		{OPTIONS.map((opt) => {
			const active = value === opt.value;
			return (
				<button
					key={opt.value}
					type="button"
					role="radio"
					aria-checked={active}
					onClick={() => onChange(opt.value)}
					className={cn(
						"rounded-md px-3 py-1 text-xs font-medium transition",
						active
							? "bg-accent text-white shadow-sm"
							: "text-muted hover:text-fg",
					)}
				>
					{opt.label}
				</button>
			);
		})}
	</div>
);
