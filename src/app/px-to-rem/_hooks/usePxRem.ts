"use client";

import { useCallback, useMemo, useState } from "react";
import { useToast } from "@/components/ui";
import {
	DEFAULT_BASE_PX,
	PX_STEPS,
	REM_STEPS,
} from "../_constants/referenceValues";
import { copyText } from "../_lib/copyToClipboard";
import { formatNumber, parseValue, pxToRem, remToPx } from "../_lib/convert";

export type ReferenceRow = {
	px: number;
	rem: number;
};

export type UsePxRem = {
	/** Raw controlled input strings. */
	pxValue: string;
	remValue: string;
	baseValue: string;
	/** Resolved base font size used for reference tables (falls back to default). */
	basePx: number;
	setPx: (raw: string) => void;
	setRem: (raw: string) => void;
	setBase: (raw: string) => void;
	copy: (value: string, unit: "px" | "rem") => void;
	pxRows: ReferenceRow[];
	remRows: ReferenceRow[];
};

export function usePxRem(): UsePxRem {
	const { toast } = useToast();

	const [pxValue, setPxValue] = useState(String(DEFAULT_BASE_PX));
	const [remValue, setRemValue] = useState("1");
	const [baseValue, setBaseValue] = useState(String(DEFAULT_BASE_PX));

	const basePx = useMemo(() => {
		const parsed = parseValue(baseValue);
		return parsed && parsed > 0 ? parsed : DEFAULT_BASE_PX;
	}, [baseValue]);

	const setPx = useCallback(
		(raw: string) => {
			setPxValue(raw);
			const px = parseValue(raw);
			setRemValue(px === null ? "" : formatNumber(pxToRem(px, basePx)));
		},
		[basePx],
	);

	const setRem = useCallback(
		(raw: string) => {
			setRemValue(raw);
			const rem = parseValue(raw);
			setPxValue(rem === null ? "" : formatNumber(remToPx(rem, basePx)));
		},
		[basePx],
	);

	const setBase = useCallback((raw: string) => {
		setBaseValue(raw);
		const nextBase = parseValue(raw);
		const resolved = nextBase && nextBase > 0 ? nextBase : DEFAULT_BASE_PX;
		// Keep pixels as the source of truth and recompute rem against the new base.
		setPxValue((currentPx) => {
			const px = parseValue(currentPx);
			setRemValue(px === null ? "" : formatNumber(pxToRem(px, resolved)));
			return currentPx;
		});
	}, []);

	const copy = useCallback(
		(value: string, unit: "px" | "rem") => {
			if (value.trim() === "") return;
			void copyText(value)
				.then(() => toast(`Copied ${value}${unit}`))
				.catch(() => toast("Failed to copy", "error"));
		},
		[toast],
	);

	const pxRows = useMemo<ReferenceRow[]>(
		() => PX_STEPS.map((px) => ({ px, rem: pxToRem(px, basePx) })),
		[basePx],
	);

	const remRows = useMemo<ReferenceRow[]>(
		() => REM_STEPS.map((rem) => ({ rem, px: remToPx(rem, basePx) })),
		[basePx],
	);

	return {
		pxValue,
		remValue,
		baseValue,
		basePx,
		setPx,
		setRem,
		setBase,
		copy,
		pxRows,
		remRows,
	};
}
