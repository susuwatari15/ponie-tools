import type { HttpMethod } from "@/types/openapi";

/**
 * Centralized HTTP-method color language (the brand spectrum).
 * `chip` = tinted badge; `solid` = active/filled; `dot` = solid swatch.
 * Uses Tailwind scales tuned for adequate contrast in light and dark.
 */
type MethodStyle = { chip: string; solid: string; dot: string };

const NEUTRAL: MethodStyle = {
	chip: "bg-line/60 text-fg/80 dark:bg-line/50",
	solid: "bg-slate-500 text-white",
	dot: "bg-slate-400",
};

export const METHOD_STYLES: Record<string, MethodStyle> = {
	get: {
		chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
		solid: "bg-emerald-500 text-white dark:bg-emerald-500/90",
		dot: "bg-emerald-500",
	},
	post: {
		chip: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
		solid: "bg-sky-500 text-white dark:bg-sky-500/90",
		dot: "bg-sky-500",
	},
	put: {
		chip: "bg-amber-500/14 text-amber-700 dark:text-amber-300",
		solid: "bg-amber-500 text-white dark:bg-amber-500/90",
		dot: "bg-amber-500",
	},
	patch: {
		chip: "bg-orange-500/14 text-orange-700 dark:text-orange-300",
		solid: "bg-orange-500 text-white dark:bg-orange-500/90",
		dot: "bg-orange-500",
	},
	delete: {
		chip: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
		solid: "bg-rose-500 text-white dark:bg-rose-500/90",
		dot: "bg-rose-500",
	},
	options: NEUTRAL,
	head: NEUTRAL,
	trace: NEUTRAL,
};

export function methodStyle(method: string): MethodStyle {
	return METHOD_STYLES[method.toLowerCase()] ?? NEUTRAL;
}

export const HTTP_METHOD_ORDER: HttpMethod[] = [
	"get",
	"post",
	"put",
	"patch",
	"delete",
	"options",
	"head",
	"trace",
];
