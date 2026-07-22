/** Pure PX <-> REM calculation helpers. */

/** Parse a user-entered value into a finite, non-negative number, or `null`. */
export function parseValue(raw: string): number | null {
	const trimmed = raw.trim();
	if (trimmed === "") return null;
	const n = Number(trimmed);
	if (!Number.isFinite(n) || n < 0) return null;
	return n;
}

export function pxToRem(px: number, base: number): number {
	if (base <= 0) return 0;
	return px / base;
}

export function remToPx(rem: number, base: number): number {
	return rem * base;
}

/**
 * Format a computed number for display: trim trailing zeros and cap precision
 * so results stay readable (e.g. `0.625`, `16`, `1.5`).
 */
export function formatNumber(n: number, maxDecimals = 4): string {
	if (!Number.isFinite(n)) return "";
	const fixed = n.toFixed(maxDecimals);
	return fixed.replace(/\.?0+$/, "");
}
