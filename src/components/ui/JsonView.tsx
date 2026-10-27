import { useMemo, type FC } from "react";
import { cn } from "./cn";
import { JSON_TOKEN_CLASS as TOKEN_CLASS } from "./jsonTokenColors";

type JsonViewProps = {
	/** Pretty-printed (or raw) JSON text to render with syntax colors. */
	value: string;
	className?: string;
};

const escapeHtml = (input: string): string =>
	input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const TOKEN_RE =
	/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

/** Turn JSON text into HTML with per-token color spans. Input is escaped first. */
function highlightJson(json: string): string {
	return escapeHtml(json).replace(
		TOKEN_RE,
		(match, str, colon, bool, nul, num) => {
			if (str !== undefined) {
				const cls = colon ? TOKEN_CLASS.key : TOKEN_CLASS.string;
				return `<span class="${cls}">${str}</span>${colon ?? ""}`;
			}
			if (bool !== undefined) return `<span class="${TOKEN_CLASS.boolean}">${bool}</span>`;
			if (nul !== undefined) return `<span class="${TOKEN_CLASS.null}">${nul}</span>`;
			if (num !== undefined) return `<span class="${TOKEN_CLASS.number}">${num}</span>`;
			return match;
		},
	);
}

export const JsonView: FC<JsonViewProps> = ({ value, className }) => {
	const html = useMemo(() => highlightJson(value), [value]);
	return (
		<pre
			className={cn(
				"scroll-ide overflow-auto font-mono text-xs leading-6 text-muted",
				className,
			)}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
};
