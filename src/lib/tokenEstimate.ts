/** Rough LLM-prompt sizing: ~4 characters per token for JSON-ish text. */
const CHARS_PER_TOKEN = 4;

export const TOKEN_WARN_THRESHOLD = 32_000;
export const TOKEN_DANGER_THRESHOLD = 128_000;

export type SizeEstimate = { tokens: number; bytes: number };

export type SizeTone = "ok" | "warn" | "danger";

export function estimateSize(text: string): SizeEstimate {
	return {
		tokens: Math.ceil(text.length / CHARS_PER_TOKEN),
		bytes: new TextEncoder().encode(text).length,
	};
}

export function sizeTone(tokens: number): SizeTone {
	if (tokens >= TOKEN_DANGER_THRESHOLD) return "danger";
	if (tokens >= TOKEN_WARN_THRESHOLD) return "warn";
	return "ok";
}

/** `850` → `~850 tokens`, `12_345` → `~12.3k tokens`. */
export function formatTokens(tokens: number): string {
	if (tokens < 1000) return `~${tokens} tokens`;
	const thousands = tokens / 1000;
	return `~${thousands < 100 ? thousands.toFixed(1) : Math.round(thousands)}k tokens`;
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
