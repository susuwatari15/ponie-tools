import type { EpochUnit } from "../_lib/epoch";

export type UnitOption = {
	value: EpochUnit;
	/** Short label shown in the unit selector. */
	label: string;
	/** Human name used in the format legend. */
	name: string;
};

/** Selectable timestamp resolutions, coarsest first. */
export const UNIT_OPTIONS: UnitOption[] = [
	{ value: "s", label: "seconds (s)", name: "seconds" },
	{ value: "ms", label: "milliseconds (ms)", name: "milliseconds" },
	{ value: "us", label: "microseconds (µs)", name: "microseconds" },
	{ value: "ns", label: "nanoseconds (ns)", name: "nanoseconds" },
];
