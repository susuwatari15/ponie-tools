import type { CSSProperties, FC, ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import type { HttpMethod } from "@/types/openapi";
import type { SchemaKind } from "../../lib/specBricks";

/** Plastic colors: bright body, lighter studs, dark ink for legible labels. */
export type BrickTone = { body: string; stud: string };

export const METHOD_BRICK_TONES: Record<HttpMethod, BrickTone> = {
	get: {
		body: "bg-emerald-400 text-emerald-950 dark:bg-emerald-500",
		stud: "bg-emerald-300 dark:bg-emerald-400",
	},
	post: {
		body: "bg-sky-400 text-sky-950 dark:bg-sky-500",
		stud: "bg-sky-300 dark:bg-sky-400",
	},
	put: {
		body: "bg-amber-300 text-amber-950 dark:bg-amber-400",
		stud: "bg-amber-200 dark:bg-amber-300",
	},
	patch: {
		body: "bg-orange-400 text-orange-950 dark:bg-orange-500",
		stud: "bg-orange-300 dark:bg-orange-400",
	},
	delete: {
		body: "bg-rose-400 text-rose-950 dark:bg-rose-500",
		stud: "bg-rose-300 dark:bg-rose-400",
	},
	options: {
		body: "bg-slate-300 text-slate-900 dark:bg-slate-400",
		stud: "bg-slate-200 dark:bg-slate-300",
	},
	head: {
		body: "bg-slate-300 text-slate-900 dark:bg-slate-400",
		stud: "bg-slate-200 dark:bg-slate-300",
	},
	trace: {
		body: "bg-slate-300 text-slate-900 dark:bg-slate-400",
		stud: "bg-slate-200 dark:bg-slate-300",
	},
};

/** Same families as the JSON view's token colors. */
export const SCHEMA_BRICK_TONES: Record<SchemaKind, BrickTone> = {
	string: {
		body: "bg-emerald-300 text-emerald-950 dark:bg-emerald-400",
		stud: "bg-emerald-200 dark:bg-emerald-300",
	},
	number: {
		body: "bg-amber-300 text-amber-950 dark:bg-amber-400",
		stud: "bg-amber-200 dark:bg-amber-300",
	},
	boolean: {
		body: "bg-fuchsia-300 text-fuchsia-950 dark:bg-fuchsia-400",
		stud: "bg-fuchsia-200 dark:bg-fuchsia-300",
	},
	object: {
		body: "bg-sky-300 text-sky-950 dark:bg-sky-400",
		stud: "bg-sky-200 dark:bg-sky-300",
	},
	array: {
		body: "bg-violet-300 text-violet-950 dark:bg-violet-400",
		stud: "bg-violet-200 dark:bg-violet-300",
	},
	ref: {
		body: "bg-rose-300 text-rose-950 dark:bg-rose-400",
		stud: "bg-rose-200 dark:bg-rose-300",
	},
	any: {
		body: "bg-slate-300 text-slate-900 dark:bg-slate-400",
		stud: "bg-slate-200 dark:bg-slate-300",
	},
};

/** Width of one stud column, in px. Operation bricks are `studs × STUD_PITCH` wide. */
export const STUD_PITCH = 34;

type BrickProps = {
	tone: BrickTone;
	studs: number;
	children: ReactNode;
	/** Fixed width (px); omit to size to content. */
	width?: number;
	className?: string;
	bodyClassName?: string;
	style?: CSSProperties;
};

/**
 * A plastic brick: a beveled body with a row of studs on top. Studs use
 * `justify-around`, so each sits centered in its own column.
 */
export const Brick: FC<BrickProps> = ({
	tone,
	studs,
	children,
	width,
	className,
	bodyClassName,
	style,
}) => (
	<div className={cn("relative pt-[5px]", className)} style={{ width, ...style }}>
		<div className="absolute inset-x-0 top-0 flex justify-around" aria-hidden>
			{Array.from({ length: studs }, (_, index) => (
				<span
					key={index}
					className={cn(
						"h-[6px] w-[14px] rounded-t-[3px] shadow-[inset_0_1px_0_rgb(255_255_255/0.55),inset_0_-1px_0_rgb(0_0_0/0.12)]",
						tone.stud,
					)}
				/>
			))}
		</div>
		<div
			className={cn(
				"relative rounded-[5px] shadow-[inset_0_1px_0_rgb(255_255_255/0.45),inset_0_-4px_0_rgb(0_0_0/0.16),0_1px_2px_rgb(0_0_0/0.18)]",
				tone.body,
				bodyClassName,
			)}
		>
			{children}
		</div>
	</div>
);
