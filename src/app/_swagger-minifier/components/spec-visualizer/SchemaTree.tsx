import { ChevronRight } from "lucide-react";
import { useState, type FC } from "react";
import { cn } from "@/components/ui/cn";
import type { CompressedSchema } from "@/types/openapi";
import { schemaChildren, schemaTypeLabel } from "../../lib/specMap";

/** Type-token colors, matching the JSON view's palette. */
const typeTone = (schema: CompressedSchema): string => {
	if (schema.$ref) return "text-rose-600 dark:text-rose-300";
	switch (schema.type) {
		case "string":
			return "text-emerald-600 dark:text-emerald-300";
		case "integer":
		case "number":
			return "text-amber-600 dark:text-amber-300";
		case "boolean":
			return "text-fuchsia-600 dark:text-fuchsia-300";
		case "array":
			return "text-violet-600 dark:text-violet-300";
		default:
			return "text-sky-600 dark:text-sky-300";
	}
};

const MAX_ENUM_CHIPS = 4;

type SchemaTreeProps = {
	name: string;
	schema: CompressedSchema;
	depth?: number;
	/** Rows shallower than this start expanded. */
	openDepth?: number;
	className?: string;
};

export const SchemaTree: FC<SchemaTreeProps> = ({
	name,
	schema,
	depth = 0,
	openDepth = 2,
	className,
}) => {
	const children = schemaChildren(schema);
	const expandable = children.length > 0 && depth < 12;
	const [open, setOpen] = useState(depth < openDepth);

	const typeLabel = schemaTypeLabel(schema);
	const enumValues = schema.enum ?? [];
	const constraints = [
		schema.format,
		schema.minLength !== undefined || schema.maxLength !== undefined
			? `len ${schema.minLength ?? 0}..${schema.maxLength ?? "∞"}`
			: null,
		schema.minimum !== undefined || schema.maximum !== undefined
			? `${schema.minimum ?? "-∞"}..${schema.maximum ?? "∞"}`
			: null,
	].filter(Boolean);

	return (
		<div className={cn("font-mono text-[11px] leading-5", className)}>
			<div
				className={cn(
					"group flex min-w-0 items-start gap-1 rounded px-1 py-0.5",
					expandable && "cursor-pointer hover:bg-raised",
				)}
				onClick={expandable ? () => setOpen((value) => !value) : undefined}
				onKeyDown={
					expandable
						? (event) => {
							if (event.key !== "Enter" && event.key !== " ") return;
							event.preventDefault();
							setOpen((value) => !value);
						}
						: undefined
				}
				role={expandable ? "button" : undefined}
				tabIndex={expandable ? 0 : undefined}
				aria-expanded={expandable ? open : undefined}
			>
				<span className="mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center text-muted">
					{expandable ? (
						<ChevronRight
							className={cn("h-3 w-3 transition-transform", open && "rotate-90")}
							aria-hidden
						/>
					) : (
						<span className="h-1 w-1 rounded-full bg-line" aria-hidden />
					)}
				</span>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-baseline gap-x-1.5">
						<span className="text-fg">
							{name}
							{schema.required ? (
								<span className="text-rose-500 dark:text-rose-400" title="required">
									*
								</span>
							) : null}
						</span>
						<span className={cn("break-all", typeTone(schema))}>{typeLabel}</span>
						{constraints.map((constraint) => (
							<span key={constraint} className="text-[10px] text-muted">
								{constraint}
							</span>
						))}
						{expandable && !open ? (
							<span className="text-[10px] text-muted">
								{`{${children.length}}`}
							</span>
						) : null}
					</div>
					{enumValues.length > 0 ? (
						<div className="mt-0.5 flex flex-wrap gap-1">
							{enumValues.slice(0, MAX_ENUM_CHIPS).map((value) => (
								<span
									key={String(value)}
									className="rounded border border-line bg-raised px-1 text-[10px] text-fg/80"
								>
									{JSON.stringify(value)}
								</span>
							))}
							{enumValues.length > MAX_ENUM_CHIPS ? (
								<span
									className="text-[10px] text-muted"
									title={enumValues.map((value) => JSON.stringify(value)).join(", ")}
								>
									+{enumValues.length - MAX_ENUM_CHIPS} more
								</span>
							) : null}
						</div>
					) : null}
					{schema.description ? (
						<p
							className="line-clamp-2 font-sans text-[11px] leading-4 text-muted"
							title={schema.description}
						>
							{schema.description}
						</p>
					) : null}
				</div>
			</div>
			{expandable && open ? (
				<div className="ml-[11px] border-l border-dashed border-line pl-2">
					{children.map(([childName, child]) => (
						<SchemaTree
							key={childName}
							name={childName}
							schema={child}
							depth={depth + 1}
							openDepth={openDepth}
						/>
					))}
				</div>
			) : null}
		</div>
	);
};
