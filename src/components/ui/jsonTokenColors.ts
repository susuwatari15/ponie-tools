/**
 * Theme-aware JSON token colors shared by `JsonView` (highlighted text) and
 * `JsonTree` (explorer) so both read the same. Each needs a light and a dark
 * variant.
 */
export const JSON_TOKEN_CLASS = {
	key: "text-sky-600 dark:text-sky-300",
	string: "text-emerald-600 dark:text-emerald-300",
	number: "text-amber-600 dark:text-amber-300",
	boolean: "text-fuchsia-600 dark:text-fuchsia-300",
	null: "text-rose-500 dark:text-rose-300",
} as const;
