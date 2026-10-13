import { Fragment, type FC } from "react";

type HighlightedPathProps = {
	path: string;
	/** Style for `{params}`; on colored bricks use something that keeps the ink color. */
	paramClassName?: string;
};

/** Path text with `{params}` picked out (accent color by default). */
export const HighlightedPath: FC<HighlightedPathProps> = ({
	path,
	paramClassName = "text-accent",
}) => (
	<>
		{path.split(/(\{[^}]+\})/g).map((part, index) =>
			part.startsWith("{") ? (
				<span key={index} className={paramClassName}>
					{part}
				</span>
			) : (
				// Offer a line break before each `/` so wrapped paths split between segments.
				<span key={index}>
					{part.split(/(?=\/)/).map((segment, segmentIndex) => (
						<Fragment key={segmentIndex}>
							{segment.startsWith("/") ? <wbr /> : null}
							{segment}
						</Fragment>
					))}
				</span>
			),
		)}
	</>
);
