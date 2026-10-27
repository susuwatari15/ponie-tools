import { afterEach, describe, expect, it, vi } from "vitest";
import {
	detectUnit,
	epochMsToParts,
	formatLocal,
	formatUtc,
	fromMillis,
	localZoneName,
	parseEpoch,
	partsToEpochMs,
	periodBounds,
	toIso,
	toMillis,
	toRelative,
	toRfc,
} from "./epoch";

/** 2026-07-22 15:36:36 UTC, a Wednesday. */
const SAMPLE_MS = Date.UTC(2026, 6, 22, 15, 36, 36);

describe("parseEpoch", () => {
	it("parses integers, including negative ones", () => {
		expect(parseEpoch("1784734596")).toBe(1784734596);
		expect(parseEpoch(" -86400 ")).toBe(-86400);
		expect(parseEpoch("0")).toBe(0);
	});

	it("rejects anything that is not a plain integer", () => {
		for (const raw of ["", "   ", "1.5", "1e3", "abc", "12a", "--1", "+5"]) {
			expect(parseEpoch(raw)).toBeNull();
		}
	});
});

describe("detectUnit", () => {
	it("guesses the resolution from the magnitude", () => {
		expect(detectUnit("1784734596")).toBe("s");
		expect(detectUnit("1784734596000")).toBe("ms");
		expect(detectUnit("1784734596000000")).toBe("us");
		expect(detectUnit("1784734596000000000")).toBe("ns");
	});

	it("uses the absolute value and defaults to seconds", () => {
		expect(detectUnit("-1784734596000")).toBe("ms");
		expect(detectUnit("0")).toBe("s");
		expect(detectUnit("abc")).toBe("s");
	});

	it("switches unit exactly at each power-of-ten boundary", () => {
		expect(detectUnit("999999999999")).toBe("s");
		expect(detectUnit("1000000000000")).toBe("ms");
		expect(detectUnit("1000000000000000")).toBe("us");
		expect(detectUnit("1000000000000000000")).toBe("ns");
	});
});

describe("toMillis / fromMillis", () => {
	it("converts each unit to and from milliseconds", () => {
		expect(toMillis(2, "s")).toBe(2000);
		expect(toMillis(2, "ms")).toBe(2);
		expect(toMillis(1_500_000, "us")).toBe(1500);
		expect(toMillis(3_000_000, "ns")).toBe(3);

		expect(fromMillis(2000, "s")).toBe(2);
		expect(fromMillis(1500, "us")).toBe(1_500_000);
		expect(fromMillis(3, "ns")).toBe(3_000_000);
	});

	it("rounds to whole units", () => {
		expect(fromMillis(1500, "s")).toBe(2);
		expect(fromMillis(1499, "s")).toBe(1);
	});
});

describe("formatting", () => {
	it("formats UTC wall-clock time with the weekday", () => {
		expect(formatUtc(SAMPLE_MS)).toBe("2026-07-22 15:36:36 UTC (Wednesday)");
		expect(formatUtc(0)).toBe("1970-01-01 00:00:00 UTC (Thursday)");
		expect(formatUtc(-1000)).toBe("1969-12-31 23:59:59 UTC (Wednesday)");
	});

	it("formats local time with the zone name", () => {
		expect(formatLocal(SAMPLE_MS)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \(.+\)$/);
		expect(formatLocal(SAMPLE_MS).endsWith(`(${localZoneName()})`)).toBe(true);
	});

	it("formats ISO and RFC strings", () => {
		expect(toIso(SAMPLE_MS)).toBe("2026-07-22T15:36:36.000Z");
		expect(toRfc(0)).toBe("Thu, 01 Jan 1970 00:00:00 GMT");
	});

	describe("toRelative", () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it("describes past and future instants relative to now", () => {
			vi.useFakeTimers();
			vi.setSystemTime(SAMPLE_MS);
			expect(toRelative(SAMPLE_MS - 2 * 60 * 60 * 1000)).toBe("about 2 hours ago");
			expect(toRelative(SAMPLE_MS + 5 * 60 * 1000)).toBe("in 5 minutes");
		});
	});
});

describe("partsToEpochMs / epochMsToParts", () => {
	const parts = { year: "2026", month: "7", day: "22", hour: "15", minute: "36", second: "36" };

	it("builds an instant from UTC parts and back", () => {
		expect(partsToEpochMs(parts, "utc")).toBe(SAMPLE_MS);
		expect(epochMsToParts(SAMPLE_MS, "utc")).toEqual(parts);
	});

	it("interprets local parts in the runner's zone", () => {
		expect(partsToEpochMs(parts, "local")).toBe(new Date(2026, 6, 22, 15, 36, 36).getTime());
		expect(epochMsToParts(partsToEpochMs(parts, "local")!, "local")).toEqual(parts);
	});

	it("rejects a blank year or non-numeric parts", () => {
		expect(partsToEpochMs({ ...parts, year: " " }, "utc")).toBeNull();
		expect(partsToEpochMs({ ...parts, month: "July" }, "utc")).toBeNull();
	});

	it("treats blank time parts as zero", () => {
		expect(partsToEpochMs({ ...parts, hour: "", minute: "", second: "" }, "utc")).toBe(
			Date.UTC(2026, 6, 22),
		);
	});

	it("normalises out-of-range parts like Date does", () => {
		expect(partsToEpochMs({ ...parts, month: "13", day: "1" }, "utc")).toBe(
			Date.UTC(2027, 0, 1, 15, 36, 36),
		);
	});
});

describe("periodBounds", () => {
	const leapDay = Date.UTC(2024, 1, 15, 10, 30, 0);

	it("returns UTC day, month and year bounds with an inclusive end second", () => {
		expect(periodBounds(leapDay, "day", "utc")).toEqual({
			startMs: Date.UTC(2024, 1, 15),
			endMs: Date.UTC(2024, 1, 15, 23, 59, 59),
		});
		expect(periodBounds(leapDay, "month", "utc")).toEqual({
			startMs: Date.UTC(2024, 1, 1),
			endMs: Date.UTC(2024, 1, 29, 23, 59, 59),
		});
		expect(periodBounds(leapDay, "year", "utc")).toEqual({
			startMs: Date.UTC(2024, 0, 1),
			endMs: Date.UTC(2024, 11, 31, 23, 59, 59),
		});
	});

	it("returns local bounds at local midnight and 23:59:59", () => {
		for (const unit of ["day", "month", "year"] as const) {
			const { startMs, endMs } = periodBounds(leapDay, unit, "local");
			expect(startMs).toBeLessThanOrEqual(leapDay);
			expect(endMs).toBeGreaterThanOrEqual(leapDay);
			expect(epochMsToParts(startMs, "local")).toMatchObject({ hour: "0", minute: "0", second: "0" });
			expect(epochMsToParts(endMs, "local")).toMatchObject({ hour: "23", minute: "59", second: "59" });
		}
	});
});
