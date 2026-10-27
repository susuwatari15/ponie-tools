/** Helpers for the command bar: fuzzy matching, recents and shortcut labels. */

const RECENT_COMMANDS_KEY = "ponie-recent-commands";
const MAX_RECENT_COMMANDS = 5;

/**
 * Subsequence match of `query` in `text`, case-insensitive. Returns a score
 * (higher is better) or null when not every query character appears in order.
 * Consecutive runs and word starts score extra, so "smin" ranks
 * "Swagger Minifier" above an incidental scattered match.
 */
export function fuzzyScore(query: string, text: string): number | null {
	const q = query.toLowerCase();
	const t = text.toLowerCase();
	if (!q) return 0;
	const direct = t.indexOf(q);
	// A plain substring always beats a scattered match; earlier is better.
	if (direct !== -1) return 1000 - direct;

	let score = 0;
	let ti = 0;
	let streak = 0;
	for (const char of q) {
		const found = t.indexOf(char, ti);
		if (found === -1) return null;
		streak = found === ti ? streak + 1 : 0;
		const atWordStart = found === 0 || /[\s/·:_-]/.test(t[found - 1]);
		score += 1 + streak * 2 + (atWordStart ? 3 : 0);
		ti = found + 1;
	}
	return score;
}

/** Ids of the most recently run commands, newest first. */
export function readRecentCommandIds(): string[] {
	try {
		const parsed = JSON.parse(window.localStorage.getItem(RECENT_COMMANDS_KEY) ?? "[]") as unknown;
		return Array.isArray(parsed)
			? parsed.filter((id): id is string => typeof id === "string").slice(0, MAX_RECENT_COMMANDS)
			: [];
	} catch {
		return [];
	}
}

export function pushRecentCommandId(id: string): void {
	try {
		const next = [id, ...readRecentCommandIds().filter((item) => item !== id)];
		window.localStorage.setItem(
			RECENT_COMMANDS_KEY,
			JSON.stringify(next.slice(0, MAX_RECENT_COMMANDS)),
		);
	} catch {
		// storage unavailable
	}
}

function isApplePlatform(): boolean {
	return typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent);
}

const KEY_LABELS: Record<string, string> = {
	enter: "↵",
	escape: "Esc",
	esc: "Esc",
	up: "↑",
	down: "↓",
	left: "←",
	right: "→",
	space: "Space",
	tab: "Tab",
};

/**
 * Splits a shortcut spec like `mod+shift+f` into display keys. `mod` is ⌘ on
 * Apple platforms and Ctrl elsewhere; `/` separates alternatives in one key
 * (`up/down` → `↑/↓`).
 */
export function formatShortcut(spec: string): string[] {
	const apple = isApplePlatform();
	return spec.split("+").map((part) => {
		const key = part.trim().toLowerCase();
		if (key === "mod") return apple ? "⌘" : "Ctrl";
		if (key === "shift") return apple ? "⇧" : "Shift";
		if (key === "alt") return apple ? "⌥" : "Alt";
		return key
			.split("/")
			.map((alt) => KEY_LABELS[alt] ?? (alt.length === 1 ? alt.toUpperCase() : alt))
			.join("/");
	});
}

/** True when a keystroke is headed for a text field rather than the page. */
export function isTypingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	const tag = target.tagName;
	return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
