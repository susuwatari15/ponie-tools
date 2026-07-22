"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, type FC } from "react";
import { cn } from "@/components/ui";
import { TOKEN_CLASS } from "../_lib/tokenColors";

type JsonTreeProps = {
	value: unknown;
	/** Object key or array index label for this node. */
	name?: string;
	depth?: number;
	className?: string;
};

/** Render a primitive JSON value with its token color. */
const Primitive: FC<{ value: unknown }> = ({ value }) => {
	if (value === null) return <span className={TOKEN_CLASS.null}>null</span>;
	if (typeof value === "string")
		return <span className={TOKEN_CLASS.string}>&quot;{value}&quot;</span>;
	if (typeof value === "number")
		return <span className={TOKEN_CLASS.number}>{String(value)}</span>;
	if (typeof value === "boolean")
		return <span className={TOKEN_CLASS.boolean}>{String(value)}</span>;
	return <span className="text-muted">{String(value)}</span>;
};

const NodeLabel: FC<{ name?: string }> = ({ name }) =>
	name === undefined ? null : (
		<span className={TOKEN_CLASS.key}>&quot;{name}&quot;</span>
	);

export const JsonTree: FC<JsonTreeProps> = ({
	value,
	name,
	depth = 0,
	className,
}) => {
	const isBranch = value !== null && typeof value === "object";
	// Local, ephemeral view state (not app state) — keep shallow levels open.
	const [open, setOpen] = useState(depth < 2);

	if (!isBranch) {
		return (
			<div className={cn("py-0.5", className)}>
				<NodeLabel name={name} />
				{name !== undefined ? <span className="text-muted">: </span> : null}
				<Primitive value={value} />
			</div>
		);
	}

	const isArray = Array.isArray(value);
	const entries = isArray
		? (value as unknown[]).map((item, i) => [String(i), item] as const)
		: Object.entries(value as Record<string, unknown>);
	const open_brace = isArray ? "[" : "{";
	const close_brace = isArray ? "]" : "}";

	return (
		<div className={className}>
			<button
				type="button"
				onClick={() => setOpen((prev) => !prev)}
				className="flex w-full items-center gap-1 rounded py-0.5 text-left transition hover:bg-raised/60"
			>
				{open ? (
					<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
				) : (
					<ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
				)}
				<NodeLabel name={name} />
				{name !== undefined ? <span className="text-muted">: </span> : null}
				<span className="text-muted">{open_brace}</span>
				{!open ? (
					<span className="text-muted">
						{" "}
						{entries.length} {entries.length === 1 ? "item" : "items"}{" "}
						{close_brace}
					</span>
				) : null}
			</button>
			{open ? (
				<div className="ml-[7px] border-l border-line pl-3">
					{entries.map(([key, item]) => (
						<JsonTree
							key={key}
							name={isArray ? undefined : key}
							value={item}
							depth={depth + 1}
						/>
					))}
					<div className="py-0.5 text-muted">{close_brace}</div>
				</div>
			) : null}
		</div>
	);
};
