import { ChevronLeft, ChevronRight, Copy, MinusCircle, X } from "lucide-react";
import { useState, type FC, type ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/components/ui/cn";
import { useCopy } from "@/components/ui/useCopy";
import type { CompressedSchema } from "@/types/openapi";
import {
	countSchemaFields,
	METHOD_SHORT_LABEL,
	schemaChildren,
	schemaKind,
	schemaTypeLabel,
	type SpecOperation,
} from "../../lib/specBricks";
import { Brick, METHOD_BRICK_TONES, SCHEMA_BRICK_TONES } from "./Brick";
import { HighlightedPath } from "./HighlightedPath";
import { SchemaBricks, type SelectedPart } from "./SchemaBricks";

const PARAM_GROUPS = [
	["path", "Path params"],
	["query", "Query"],
	["header", "Headers"],
	["cookie", "Cookies"],
] as const;

type BuildStep = {
	key: string;
	title: string;
	fields: Array<[string, CompressedSchema]>;
	pieces: number;
	isResponse?: boolean;
};

type SpecOperationInspectorProps = {
	operation: SpecOperation;
	index: number;
	total: number;
	onStep: (delta: number) => void;
	onClose: () => void;
	onDeselect?: (id: string) => void;
	className?: string;
};

/** A body/response that is itself a leaf (e.g. `string[]`) still gets one brick. */
const fieldsOf = (name: string, schema: CompressedSchema): Array<[string, CompressedSchema]> => {
	const children = schemaChildren(schema);
	return children.length > 0 ? children : [[name, schema]];
};

const buildSteps = (operation: SpecOperation): BuildStep[] => {
	const { request, response } = operation.op;
	const steps: BuildStep[] = [];
	for (const [group, title] of PARAM_GROUPS) {
		const params = request?.[group];
		if (!params || Object.keys(params).length === 0) continue;
		const fields = Object.entries(params);
		steps.push({ key: group, title, fields, pieces: fields.length });
	}
	if (request?.body) {
		steps.push({
			key: "body",
			title: "Request body",
			fields: fieldsOf("body", request.body),
			pieces: countSchemaFields(request.body),
		});
	}
	if (response) {
		steps.push({
			key: "response",
			title: "Response",
			fields: fieldsOf("response", response),
			pieces: countSchemaFields(response),
			isResponse: true,
		});
	}
	return steps;
};

const StepHeader: FC<{ number: number; title: string; pieces: number; isResponse?: boolean }> = ({
	number,
	title,
	pieces,
	isResponse,
}) => (
	<div className="mb-2 flex items-center gap-2">
		<span
			className={cn(
				"flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold",
				isResponse ? "bg-accent text-white" : "bg-fg text-surface",
			)}
		>
			{number}
		</span>
		<h4 className="text-xs font-semibold text-fg">{title}</h4>
		<span className="ml-auto font-mono text-[10px] text-muted">
			×{pieces} {pieces === 1 ? "pc" : "pcs"}
		</span>
	</div>
);

const DetailRow: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
	<div className="flex gap-2">
		<dt className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted">{label}</dt>
		<dd className="min-w-0 flex-1 break-words font-mono text-[11px] text-fg">{children}</dd>
	</div>
);

/** Spec sheet for the brick the user clicked. */
const PartDetail: FC<{ part: SelectedPart; onClose: () => void }> = ({ part, onClose }) => {
	const { name, schema } = part;
	const range =
		schema.minimum !== undefined || schema.maximum !== undefined
			? `${schema.minimum ?? "-∞"} … ${schema.maximum ?? "∞"}`
			: null;
	const length =
		schema.minLength !== undefined || schema.maxLength !== undefined
			? `${schema.minLength ?? 0} … ${schema.maxLength ?? "∞"}`
			: null;

	return (
		<div className="border-t border-line bg-raised/80 p-3 backdrop-blur">
			<div className="mb-2 flex items-center gap-2">
				<Brick
					tone={SCHEMA_BRICK_TONES[schemaKind(schema)]}
					studs={2}
					bodyClassName="h-4 w-9"
				>
					<span className="sr-only">{schemaKind(schema)}</span>
				</Brick>
				<p className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-fg">{name}</p>
				<IconButton label="Close part details" className="h-6 w-6" onClick={onClose}>
					<X className="h-3 w-3" />
				</IconButton>
			</div>
			<dl className="space-y-1">
				<DetailRow label="type">{schemaTypeLabel(schema)}</DetailRow>
				<DetailRow label="required">{schema.required ? "yes" : "no"}</DetailRow>
				{schema.format ? <DetailRow label="format">{schema.format}</DetailRow> : null}
				{range ? <DetailRow label="range">{range}</DetailRow> : null}
				{length ? <DetailRow label="length">{length}</DetailRow> : null}
				{schema.enum?.length ? (
					<DetailRow label="enum">
						<span className="flex flex-wrap gap-1">
							{schema.enum.map((value) => (
								<span
									key={String(value)}
									className="rounded border border-line bg-surface px-1 text-[10px]"
								>
									{JSON.stringify(value)}
								</span>
							))}
						</span>
					</DetailRow>
				) : null}
				{schema.example !== undefined ? (
					<DetailRow label="example">{JSON.stringify(schema.example)}</DetailRow>
				) : null}
				{schema.description ? (
					<DetailRow label="about">
						<span className="font-sans text-muted">{schema.description}</span>
					</DetailRow>
				) : null}
			</dl>
		</div>
	);
};

export const SpecOperationInspector: FC<SpecOperationInspectorProps> = ({
	operation,
	index,
	total,
	onStep,
	onClose,
	onDeselect,
	className,
}) => {
	const copy = useCopy();
	const [part, setPart] = useState<SelectedPart | null>(null);
	const { op, method, path } = operation;
	const steps = buildSteps(operation);

	const copyOperation = () =>
		copy(
			JSON.stringify({ [path]: { [method]: op } }, null, 2),
			`${method.toUpperCase()} ${path} copied`,
		);

	return (
		<aside
			className={cn("flex min-h-0 flex-col bg-surface", className)}
			aria-label="Build instructions"
		>
			<div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
				<div className="flex items-center gap-1">
					<IconButton label="Previous brick (←)" className="h-7 w-7" onClick={() => onStep(-1)}>
						<ChevronLeft className="h-3.5 w-3.5" />
					</IconButton>
					<IconButton label="Next brick (→)" className="h-7 w-7" onClick={() => onStep(1)}>
						<ChevronRight className="h-3.5 w-3.5" />
					</IconButton>
					<span className="ml-1 font-mono text-[10px] text-muted">
						{index + 1}/{total}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<IconButton label="Copy operation JSON" className="h-7 w-7" onClick={copyOperation}>
						<Copy className="h-3.5 w-3.5" />
					</IconButton>
					{onDeselect ? (
						<IconButton
							label="Remove from selection"
							tone="danger"
							className="h-7 w-7"
							onClick={() => onDeselect(operation.id)}
						>
							<MinusCircle className="h-3.5 w-3.5" />
						</IconButton>
					) : null}
					<IconButton label="Close (Esc)" className="h-7 w-7" onClick={onClose}>
						<X className="h-3.5 w-3.5" />
					</IconButton>
				</div>
			</div>

			<div className="scroll-ide min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
				<div>
					<p className="font-mono text-[10px] uppercase tracking-widest text-muted">
						// build instructions
					</p>
					<Brick
						tone={METHOD_BRICK_TONES[method]}
						studs={operation.studs}
						className="mt-2 max-w-full"
						bodyClassName="px-3 pb-2 pt-1.5"
					>
						<span className="block font-mono text-[10px] font-black tracking-wider">
							{METHOD_SHORT_LABEL[method]} · {operation.fieldCount} {operation.fieldCount === 1 ? "field" : "fields"}
						</span>
						<span className="block break-all font-mono text-xs font-semibold">
							<HighlightedPath
								path={path}
								paramClassName="underline decoration-dotted decoration-2 underline-offset-2"
							/>
						</span>
					</Brick>
					{op.summary ? <p className="mt-2 text-sm font-medium text-fg">{op.summary}</p> : null}
					{op.description && op.description !== op.summary ? (
						<p className="mt-1 whitespace-pre-line text-xs text-muted">{op.description}</p>
					) : null}
					<div className="mt-2 flex flex-wrap gap-1">
						{op.operationId ? (
							<span className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted">
								#{op.operationId}
							</span>
						) : null}
						{op.tags?.map((tag) => (
							<span
								key={tag}
								className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent"
							>
								{tag}
							</span>
						))}
					</div>
				</div>

				{steps.length === 0 ? (
					<p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-muted">
						No parts to assemble — this operation has no params, body or response schema.
					</p>
				) : (
					steps.map((step, stepIndex) => (
						<section
							key={step.key}
							className={cn(
								"rounded-lg border p-3",
								step.isResponse
									? "border-accent/30 bg-accent/5"
									: "border-line bg-raised/40",
							)}
						>
							<StepHeader
								number={stepIndex + 1}
								title={step.title}
								pieces={step.pieces}
								isResponse={step.isResponse}
							/>
							<SchemaBricks
								fields={step.fields}
								partKey={step.key}
								selectedKey={part?.key ?? null}
								onSelectPart={setPart}
							/>
						</section>
					))
				)}
			</div>

			{part ? <PartDetail part={part} onClose={() => setPart(null)} /> : null}
		</aside>
	);
};
