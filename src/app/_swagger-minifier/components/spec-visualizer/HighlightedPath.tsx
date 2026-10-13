import type { FC } from "react";

/** Path text with `{params}` picked out in the accent color. */
export const HighlightedPath: FC<{ path: string }> = ({ path }) => (
	<>
		{path.split(/(\{[^}]+\})/g).map((part, index) =>
			part.startsWith("{") ? (
				<span key={index} className="text-accent">
					{part}
				</span>
			) : (
				<span key={index}>{part}</span>
			),
		)}
	</>
);
