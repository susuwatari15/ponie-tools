/** Pure Unix-timestamp <-> date conversion helpers. No React, no side effects. */

import { format, formatDistanceToNow } from "date-fns";

export type EpochUnit = "s" | "ms" | "us" | "ns";
export type Zone = "utc" | "local";
export type PeriodUnit = "day" | "month" | "year";

export type DateParts = {
	year: string;
	month: string;
	day: string;
	hour: string;
	minute: string;
	second: string;
};

/** How many milliseconds one unit of each resolution represents. */
const UNIT_TO_MS: Record<EpochUnit, number> = {
	s: 1000,
	ms: 1,
	us: 1 / 1000,
	ns: 1 / 1_000_000,
};

/**
 * Parse a raw timestamp string into a finite number, or `null`. Accepts an
 * optional leading `-` (pre-1970) and rejects anything non-numeric.
 */
export function parseEpoch(raw: string): number | null {
	const trimmed = raw.trim();
	if (trimmed === "" || !/^-?\d+$/.test(trimmed)) return null;
	const n = Number(trimmed);
	return Number.isFinite(n) ? n : null;
}

/**
 * Guess the resolution of a timestamp from the magnitude of its integer part.
 * Modern epochs are ~10 digits in seconds, ~13 in ms, ~16 in µs, ~19 in ns.
 */
export function detectUnit(raw: string): EpochUnit {
	const abs = Math.abs(Number(raw.trim().replace(/^-/, "")));
	if (!Number.isFinite(abs) || abs < 1e12) return "s";
	if (abs < 1e15) return "ms";
	if (abs < 1e18) return "us";
	return "ns";
}

/** Normalize a value in the given unit to JS milliseconds. */
export function toMillis(value: number, unit: EpochUnit): number {
	return value * UNIT_TO_MS[unit];
}

/** Convert JS milliseconds back into whole units of the given resolution. */
export function fromMillis(ms: number, unit: EpochUnit): number {
	return Math.round(ms / UNIT_TO_MS[unit]);
}

const pad = (n: number, len = 2): string => String(Math.abs(n)).padStart(len, "0");

const WEEKDAYS = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

/**
 * Format an instant as a UTC wall-clock string, e.g.
 * `2026-07-22 15:36:36 UTC (Wednesday)`. Built from `getUTC*` getters so it is
 * unaffected by the runner's local zone (date-fns `format` uses local time).
 */
export function formatUtc(ms: number): string {
	const d = new Date(ms);
	const y = d.getUTCFullYear();
	const stamp = `${pad(y, 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
	return `${stamp} UTC (${WEEKDAYS[d.getUTCDay()]})`;
}

/** The viewer's resolved IANA time-zone name, e.g. `Asia/Ho_Chi_Minh`. */
export function localZoneName(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone;
	} catch {
		return "local";
	}
}

/**
 * Format an instant in the viewer's local zone, e.g.
 * `2026-07-22 22:36:36 (Asia/Ho_Chi_Minh)`.
 */
export function formatLocal(ms: number): string {
	return `${format(new Date(ms), "yyyy-MM-dd HH:mm:ss")} (${localZoneName()})`;
}

export function toIso(ms: number): string {
	return new Date(ms).toISOString();
}

export function toRfc(ms: number): string {
	return new Date(ms).toUTCString();
}

/** Human relative time, e.g. `about 2 hours ago`. */
export function toRelative(ms: number): string {
	return formatDistanceToNow(new Date(ms), { addSuffix: true });
}

/**
 * Build an instant (in ms) from calendar parts interpreted in the given zone,
 * or `null` if any part is missing / non-numeric.
 */
export function partsToEpochMs(parts: DateParts, zone: Zone): number | null {
	const nums = {
		year: Number(parts.year),
		month: Number(parts.month),
		day: Number(parts.day),
		hour: Number(parts.hour),
		minute: Number(parts.minute),
		second: Number(parts.second),
	};
	const values = Object.values(nums);
	if (values.some((n) => !Number.isFinite(n)) || parts.year.trim() === "") {
		return null;
	}

	const ms =
		zone === "utc"
			? Date.UTC(
					nums.year,
					nums.month - 1,
					nums.day,
					nums.hour,
					nums.minute,
					nums.second,
				)
			: new Date(
					nums.year,
					nums.month - 1,
					nums.day,
					nums.hour,
					nums.minute,
					nums.second,
				).getTime();

	return Number.isFinite(ms) ? ms : null;
}

/** Split an instant into calendar parts (as strings) for the given zone. */
export function epochMsToParts(ms: number, zone: Zone): DateParts {
	const d = new Date(ms);
	const get = (utc: () => number, local: () => number) =>
		zone === "utc" ? utc() : local();
	return {
		year: String(get(() => d.getUTCFullYear(), () => d.getFullYear())),
		month: String(get(() => d.getUTCMonth() + 1, () => d.getMonth() + 1)),
		day: String(get(() => d.getUTCDate(), () => d.getDate())),
		hour: String(get(() => d.getUTCHours(), () => d.getHours())),
		minute: String(get(() => d.getUTCMinutes(), () => d.getMinutes())),
		second: String(get(() => d.getUTCSeconds(), () => d.getSeconds())),
	};
}

/**
 * Floor/ceil an instant to the start and end of its containing day / month /
 * year, in the given zone. The end boundary is the last whole second of the
 * period (inclusive).
 */
export function periodBounds(
	ms: number,
	unit: PeriodUnit,
	zone: Zone,
): { startMs: number; endMs: number } {
	const d = new Date(ms);

	if (zone === "utc") {
		const y = d.getUTCFullYear();
		const mo = d.getUTCMonth();
		const day = d.getUTCDate();
		let startMs: number;
		let endMs: number;
		if (unit === "day") {
			startMs = Date.UTC(y, mo, day, 0, 0, 0);
			endMs = Date.UTC(y, mo, day, 23, 59, 59);
		} else if (unit === "month") {
			startMs = Date.UTC(y, mo, 1, 0, 0, 0);
			endMs = Date.UTC(y, mo + 1, 0, 23, 59, 59);
		} else {
			startMs = Date.UTC(y, 0, 1, 0, 0, 0);
			endMs = Date.UTC(y, 11, 31, 23, 59, 59);
		}
		return { startMs, endMs };
	}

	const y = d.getFullYear();
	const mo = d.getMonth();
	const day = d.getDate();
	let startMs: number;
	let endMs: number;
	if (unit === "day") {
		startMs = new Date(y, mo, day, 0, 0, 0).getTime();
		endMs = new Date(y, mo, day, 23, 59, 59).getTime();
	} else if (unit === "month") {
		startMs = new Date(y, mo, 1, 0, 0, 0).getTime();
		endMs = new Date(y, mo + 1, 0, 23, 59, 59).getTime();
	} else {
		startMs = new Date(y, 0, 1, 0, 0, 0).getTime();
		endMs = new Date(y, 11, 31, 23, 59, 59).getTime();
	}
	return { startMs, endMs };
}
