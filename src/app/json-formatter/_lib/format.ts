/** Structured JSON syntax error with a 1-based line and column. */
export type JsonError = {
	message: string;
	line: number;
	column: number;
};

export type ParseResult =
	| { ok: true; value: unknown }
	| { ok: false; error: JsonError };

/** Compute a 1-based line/column for a 0-based character offset in `input`. */
function locationFromOffset(
	input: string,
	offset: number,
): { line: number; column: number } {
	const clamped = Math.max(0, Math.min(offset, input.length));
	let line = 1;
	let column = 1;
	for (let i = 0; i < clamped; i += 1) {
		if (input[i] === "\n") {
			line += 1;
			column = 1;
		} else {
			column += 1;
		}
	}
	return { line, column };
}

/** Derive line/column from a V8 `SyntaxError` message + the raw input. */
function errorLocation(
	message: string,
	input: string,
): { line: number; column: number } {
	// Modern V8: "... (line 3 column 5)"
	const lineCol = message.match(/line (\d+) column (\d+)/i);
	if (lineCol) {
		return { line: Number(lineCol[1]), column: Number(lineCol[2]) };
	}
	// Older V8: "... at position 42"
	const pos = message.match(/at position (\d+)/i);
	if (pos) {
		return locationFromOffset(input, Number(pos[1]));
	}
	return { line: 1, column: 1 };
}

/**
 * Parse JSON, returning either the parsed value or a located syntax error.
 * Empty/whitespace-only input is treated as a valid `null` value so callers can
 * show a neutral empty state instead of an error.
 */
export function parseJson(input: string): ParseResult {
	if (input.trim() === "") {
		return { ok: true, value: null };
	}
	try {
		return { ok: true, value: JSON.parse(input) };
	} catch (err) {
		const message = err instanceof Error ? err.message : "Invalid JSON";
		const { line, column } = errorLocation(message, input);
		return { ok: false, error: { message, line, column } };
	}
}

/** Pretty-print with 2-space indentation. */
export function beautify(value: unknown): string {
	return JSON.stringify(value, null, 2);
}

/** Compact single-line JSON. */
export function minify(value: unknown): string {
	return JSON.stringify(value);
}
