"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui";
import { copyText } from "../_lib/copyToClipboard";
import {
	type DateParts,
	type EpochUnit,
	type PeriodUnit,
	type Zone,
	detectUnit,
	epochMsToParts,
	formatLocal,
	formatUtc,
	fromMillis,
	parseEpoch,
	partsToEpochMs,
	periodBounds,
	toIso,
	toRelative,
	toMillis,
	toRfc,
} from "../_lib/epoch";

export type EpochDateResult = {
	utc: string;
	local: string;
	iso: string;
	rfc: string;
	relative: string;
};

export type PeriodResult = {
	startEpoch: number;
	endEpoch: number;
};

export type UseEpochConverter = {
	/** Live current epoch in seconds; `null` until mounted (avoids hydration mismatch). */
	nowSeconds: number | null;

	/** Epoch -> Date. */
	epochInput: string;
	unit: EpochUnit;
	autoUnit: boolean;
	dateResult: EpochDateResult | null;
	setEpochInput: (raw: string) => void;
	setUnit: (unit: EpochUnit) => void;

	/** Date -> Epoch. */
	dateParts: DateParts;
	dateZone: Zone;
	dateEpochResult: { seconds: number; millis: number } | null;
	setPart: (key: keyof DateParts, value: string) => void;
	setDateZone: (zone: Zone) => void;

	/** Period boundaries. */
	periodDate: string;
	periodUnit: PeriodUnit;
	periodZone: Zone;
	periodResult: PeriodResult | null;
	setPeriodDate: (value: string) => void;
	setPeriodUnit: (unit: PeriodUnit) => void;
	setPeriodZone: (zone: Zone) => void;

	copy: (value: string, note?: string) => void;
};

const EMPTY_PARTS: DateParts = {
	year: "",
	month: "",
	day: "",
	hour: "",
	minute: "",
	second: "",
};

export function useEpochConverter(): UseEpochConverter {
	const { toast } = useToast();

	// --- Live counter -------------------------------------------------------
	const [nowMs, setNowMs] = useState<number | null>(null);
	useEffect(() => {
		setNowMs(Date.now());
		const id = setInterval(() => setNowMs(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);
	const nowSeconds = nowMs === null ? null : Math.floor(nowMs / 1000);

	// --- Epoch -> Date ------------------------------------------------------
	const [epochInput, setEpochInputRaw] = useState("");
	const [unit, setUnitRaw] = useState<EpochUnit>("s");
	const [autoUnit, setAutoUnit] = useState(true);

	const setEpochInput = useCallback((raw: string) => {
		setEpochInputRaw(raw);
		setAutoUnit((auto) => {
			if (auto && raw.trim() !== "") setUnitRaw(detectUnit(raw));
			return auto;
		});
	}, []);

	const setUnit = useCallback((next: EpochUnit) => {
		setUnitRaw(next);
		setAutoUnit(false);
	}, []);

	const dateResult = useMemo<EpochDateResult | null>(() => {
		const value = parseEpoch(epochInput);
		if (value === null) return null;
		const ms = toMillis(value, unit);
		if (!Number.isFinite(ms)) return null;
		try {
			return {
				utc: formatUtc(ms),
				local: formatLocal(ms),
				iso: toIso(ms),
				rfc: toRfc(ms),
				relative: toRelative(ms),
			};
		} catch {
			// Out-of-range dates throw on toISOString(); treat as invalid input.
			return null;
		}
	}, [epochInput, unit]);

	// --- Date -> Epoch ------------------------------------------------------
	const [dateParts, setDateParts] = useState<DateParts>(EMPTY_PARTS);
	const [dateZone, setDateZone] = useState<Zone>("local");

	// Pre-fill the date fields from "now" once, on mount.
	useEffect(() => {
		setDateParts(epochMsToParts(Date.now(), "local"));
	}, []);

	const setPart = useCallback((key: keyof DateParts, value: string) => {
		setDateParts((prev) => ({ ...prev, [key]: value }));
	}, []);

	const dateEpochResult = useMemo(() => {
		const ms = partsToEpochMs(dateParts, dateZone);
		if (ms === null) return null;
		return { seconds: fromMillis(ms, "s"), millis: ms };
	}, [dateParts, dateZone]);

	// --- Period boundaries --------------------------------------------------
	const [periodDate, setPeriodDate] = useState("");
	const [periodUnit, setPeriodUnit] = useState<PeriodUnit>("day");
	const [periodZone, setPeriodZone] = useState<Zone>("local");

	useEffect(() => {
		// Default the reference date to today (local), as a `yyyy-MM-dd` value.
		const parts = epochMsToParts(Date.now(), "local");
		setPeriodDate(
			`${parts.year.padStart(4, "0")}-${parts.month.padStart(2, "0")}-${parts.day.padStart(2, "0")}`,
		);
	}, []);

	const periodResult = useMemo<PeriodResult | null>(() => {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(periodDate)) return null;
		const [y, mo, d] = periodDate.split("-").map(Number);
		const refMs =
			periodZone === "utc"
				? Date.UTC(y, mo - 1, d, 12, 0, 0)
				: new Date(y, mo - 1, d, 12, 0, 0).getTime();
		if (!Number.isFinite(refMs)) return null;
		const { startMs, endMs } = periodBounds(refMs, periodUnit, periodZone);
		return {
			startEpoch: fromMillis(startMs, "s"),
			endEpoch: fromMillis(endMs, "s"),
		};
	}, [periodDate, periodUnit, periodZone]);

	// --- Clipboard ----------------------------------------------------------
	const copy = useCallback(
		(value: string, note?: string) => {
			if (value.trim() === "") return;
			void copyText(value)
				.then(() => toast(note ?? `Copied ${value}`))
				.catch(() => toast("Failed to copy", "error"));
		},
		[toast],
	);

	return {
		nowSeconds,
		epochInput,
		unit,
		autoUnit,
		dateResult,
		setEpochInput,
		setUnit,
		dateParts,
		dateZone,
		dateEpochResult,
		setPart,
		setDateZone,
		periodDate,
		periodUnit,
		periodZone,
		periodResult,
		setPeriodDate,
		setPeriodUnit,
		setPeriodZone,
		copy,
	};
}
