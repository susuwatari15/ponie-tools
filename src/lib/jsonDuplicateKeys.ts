export type DuplicateJsonKey = {
	/** The repeated key name. */
	key: string;
	/** Slash-joined path of enclosing keys, e.g. `paths//mrp/trace/get`. */
	pointer: string;
	/** 1-based line where the duplicate occurrence starts. */
	line: number;
	/** 1-based line where the first occurrence started. */
	firstLine: number;
};

type Frame = {
	object: boolean;
	/** Key -> line of the first occurrence. Only populated for objects. */
	keys: Map<string, number>;
	/** The key this frame was opened under, for pointer building. */
	label: string;
};

const MAX_DUPLICATES = 50;

/**
 * Scans raw JSON text for keys repeated inside the same object.
 *
 * `JSON.parse` silently keeps the last occurrence, so a duplicate key is real
 * data loss that no check on the parsed document can ever see — it has to be
 * caught on the text.
 *
 * This is a tolerant scanner, not a validator: malformed input yields fewer
 * findings rather than an error, since the caller already knows the text parses.
 */
export function findDuplicateJsonKeys(raw: string): DuplicateJsonKey[] {
	const duplicates: DuplicateJsonKey[] = [];
	const stack: Frame[] = [];
	let index = 0;
	let line = 1;
	let pendingKey = "";

	const pointer = () =>
		stack
			.map((frame) => frame.label)
			.filter(Boolean)
			.join("/");

	while (index < raw.length && duplicates.length < MAX_DUPLICATES) {
		const char = raw[index];

		if (char === "\n") {
			line += 1;
			index += 1;
			continue;
		}

		if (char === "{" || char === "[") {
			stack.push({
				object: char === "{",
				keys: new Map(),
				label: pendingKey,
			});
			pendingKey = "";
			index += 1;
			continue;
		}

		if (char === "}" || char === "]") {
			stack.pop();
			index += 1;
			continue;
		}

		if (char !== '"') {
			index += 1;
			continue;
		}

		// String literal: consume it, then decide whether it was a key by
		// looking for the `:` that would follow.
		let cursor = index + 1;
		let value = "";
		while (cursor < raw.length) {
			const inner = raw[cursor];
			if (inner === "\\") {
				value += raw[cursor + 1] ?? "";
				cursor += 2;
				continue;
			}
			if (inner === '"') break;
			value += inner;
			cursor += 1;
		}

		const stringStartLine = line;
		index = cursor + 1;

		let lookahead = index;
		while (lookahead < raw.length && /\s/.test(raw[lookahead] ?? "")) {
			if (raw[lookahead] === "\n") line += 1;
			lookahead += 1;
		}

		const frame = stack[stack.length - 1];
		if (raw[lookahead] !== ":" || !frame?.object) {
			index = lookahead;
			continue;
		}

		const firstLine = frame.keys.get(value);
		if (firstLine === undefined) {
			frame.keys.set(value, stringStartLine);
		} else {
			duplicates.push({
				key: value,
				pointer: pointer(),
				line: stringStartLine,
				firstLine,
			});
		}

		pendingKey = value;
		index = lookahead + 1;
	}

	return duplicates;
}
