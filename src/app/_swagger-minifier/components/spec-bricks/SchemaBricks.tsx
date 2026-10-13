import { ChevronRight } from "lucide-react";
import { useState, type FC, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import type { CompressedSchema } from "@/types/openapi";
import { schemaChildren, schemaKind, schemaTypeLabel } from "../../lib/specBricks";
import { Brick, SCHEMA_BRICK_TONES } from "./Brick";

export type SelectedPart = { key: string; name: string; schema: CompressedSchema };

type SchemaBricksProps = {
	fields: Array<[string, CompressedSchema]>;
	/** Key prefix keeping part keys unique across steps. */
	partKey: string;
	selectedKey: string | null;
	onSelectPart: (part: SelectedPart) => void;
	depth?: number;
	/** Assemblies shallower than this start open. */
	openDepth?: number;
};

const MAX_DEPTH = 12;

const leafStuds = (name: string) => Math.min(6, Math.max(1, Math.ceil((name.length + 2) / 5)));

const selectedRing =
	"ring-2 ring-fg/70 ring-offset-2 ring-offset-surface -translate-y-0.5";

const LeafBrick: FC<{
	name: string;
	schema: CompressedSchema;
	selected: boolean;
	onSelect: () => void;
}> = ({ name, schema, selected, onSelect }) => (
	<button
		type="button"
		onClick={onSelect}
		aria-pressed={selected}
		title={schema.description ?? `${name}: ${schemaTypeLabel(schema)}`}
		className="group rounded-[5px] text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
	>
		<Brick
			tone={SCHEMA_BRICK_TONES[schemaKind(schema)]}
			studs={leafStuds(name)}
			bodyClassName={cn("px-2 pb-1.5 pt-1 transition", selected && selectedRing)}
		>
			<span className="block whitespace-nowrap font-mono text-[11px] font-bold leading-4">
				{name}
				{schema.required ? <span title="required">*</span> : null}
			</span>
			<span className="block whitespace-nowrap font-mono text-[9px] leading-3 opacity-75">
				{schemaTypeLabel(schema)}
				{schema.enum?.length ? ` · ${schema.enum.length} opts` : ""}
			</span>
		</Brick>
	</button>
);

const Assembly: FC<{
	name: string;
	schema: CompressedSchema;
	partKey: string;
	depth: number;
	openDepth: number;
	selectedKey: string | null;
	onSelectPart: (part: SelectedPart) => void;
}> = ({ name, schema, partKey, depth, openDepth, selectedKey, onSelectPart }) => {
	const [open, setOpen] = useState(depth < openDepth);
	const children = schemaChildren(schema);
	const selected = selectedKey === partKey;

	return (
		<div className="rounded-lg border border-dashed border-line bg-raised/40 p-2">
			<button
				type="button"
				onClick={() => {
					setOpen((value) => !value);
					onSelectPart({ key: partKey, name, schema });
				}}
				aria-expanded={open}
				className="flex items-center gap-1.5 rounded-[5px] text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
			>
				<Brick
					tone={SCHEMA_BRICK_TONES[schemaKind(schema)]}
					studs={Math.min(8, Math.max(2, leafStuds(name) + 1))}
					bodyClassName={cn(
						"flex items-center gap-1.5 px-2 pb-1.5 pt-1 transition",
						selected && selectedRing,
					)}
				>
					<ChevronRight
						className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-90")}
						aria-hidden
					/>
					<span className="whitespace-nowrap font-mono text-[11px] font-bold leading-4">
						{name}
						{schema.required ? "*" : ""}
					</span>
					<span className="whitespace-nowrap font-mono text-[9px] opacity-75">
						{schemaTypeLabel(schema)}
					</span>
				</Brick>
				<span className="font-mono text-[10px] text-muted">
					×{children.length} {children.length === 1 ? "pc" : "pcs"}
				</span>
			</button>
			{open ? (
				<div className="mt-2 border-l-2 border-line pl-2">
					<SchemaBricks
						fields={children}
						partKey={partKey}
						depth={depth + 1}
						openDepth={openDepth}
						selectedKey={selectedKey}
						onSelectPart={onSelectPart}
					/>
				</div>
			) : null}
		</div>
	);
};

/**
 * Lays fields out as bricks: runs of plain fields pack into a wrapping row,
 * while objects/arrays of objects become collapsible sub-assemblies.
 */
export const SchemaBricks: FC<SchemaBricksProps> = ({
	fields,
	partKey,
	selectedKey,
	onSelectPart,
	depth = 0,
	openDepth = 1,
}) => {
	const blocks: ReactNode[] = [];
	let leaves: ReactNode[] = [];

	const flushLeaves = () => {
		if (leaves.length === 0) return;
		blocks.push(
			<div key={`row-${blocks.length}`} className="flex flex-wrap gap-x-1.5 gap-y-2">
				{leaves}
			</div>,
		);
		leaves = [];
	};

	for (const [name, schema] of fields) {
		const key = `${partKey}.${name}`;
		if (schemaChildren(schema).length > 0 && depth < MAX_DEPTH) {
			flushLeaves();
			blocks.push(
				<Assembly
					key={key}
					name={name}
					schema={schema}
					partKey={key}
					depth={depth}
					openDepth={openDepth}
					selectedKey={selectedKey}
					onSelectPart={onSelectPart}
				/>,
			);
		} else {
			leaves.push(
				<LeafBrick
					key={key}
					name={name}
					schema={schema}
					selected={selectedKey === key}
					onSelect={() => onSelectPart({ key, name, schema })}
				/>,
			);
		}
	}
	flushLeaves();

	return <div className="space-y-2">{blocks}</div>;
};
