"use client";

import { Rows3, Rows4 } from "lucide-react";
import type { FC } from "react";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/SegmentedControl";
import type { Density } from "../../constants/preferences-storage";
import { usePreferences } from "./PreferencesProvider";

const OPTIONS: SegmentedOption<Density>[] = [
	{ value: "comfortable", label: "Comfortable density", icon: Rows3 },
	{ value: "compact", label: "Compact density", icon: Rows4 },
];

/** Comfortable / compact switch for long lists (endpoints, diff tree, permissions). */
export const DensityToggle: FC<{ className?: string }> = ({ className }) => {
	const { density, setDensity } = usePreferences();
	return (
		<SegmentedControl
			value={density}
			onChange={setDensity}
			options={OPTIONS}
			label="List density"
			iconOnly
			className={className}
		/>
	);
};
