import { ChevronLeft, ChevronRight, Copy, MinusCircle, X } from "lucide-react";
import type { FC, ReactNode } from "react";
import { MethodBadge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/components/ui/cn";
import { methodStyle } from "@/components/ui/methodColors";
import { useToast } from "@/components/ui/ToastProvider";
import type { CompressedSchema } from "@/types/openapi";
import { countSchemaFields, type SpecOperation } from "../../lib/specMap";
import { HighlightedPath } from "./HighlightedPath";
import { SchemaTree } from "./SchemaTree";

const PARAM_GROUPS = ["path", "query", "header", "cookie"] as const;

type SpecOperationInspectorProps = {
	operation: SpecOperation;
	index: number;
	total: number;
	onStep: (delta: number) => void;
	onClose: () => void;
	onDeselect?: (id: string) => void;
	className?: string;
};

const Section: FC<{ title: string; meta?: ReactNode; children: ReactNode }> = ({
	title,
	meta,
	children,
}) => (
	<section className="rounded-lg border border-line bg-raised/50">
		<header className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
			<h4 className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
				{title}
			</h4>
			{meta ? <span className="font-mono text-[10px] text-muted">{meta}</span> : null}
		</header>
		<div className="p-1.5">{children}</div>
	</section>
);

export const SpecOperationInspector: FC<SpecOperationInspectorProps> = ({
	operation,
	index,
	total,
	onStep,
	onClose,
	onDeselect,
	className,
}) => {
	const { toast } = useToast();
	const { op, method, path } = operation;
	const request = op.request;

	const paramGroups = PARAM_GROUPS.map(
		(group) => [group, request?.[group]] as const,
	).filter((entry): entry is readonly [typeof entry[0], Record<string, CompressedSchema>] =>
		Boolean(entry[1] && Object.keys(entry[1]).length > 0),
	);
	const hasRequest = paramGroups.length > 0 || Boolean(request?.body);

	const copyOperation = async () => {
		const json = JSON.stringify({ [path]: { [method]: op } }, null, 2);
		try {
			await navigator.clipboard.writeText(json);
			toast(`${method.toUpperCase()} ${path} copied`, "success");
		} catch {
			toast("Couldn't access the clipboard", "error");
		}
	};

	return (
		<aside
			className={cn("flex min-h-0 flex-col bg-surface", className)}
			aria-label="Operation inspector"
		>
			<div className={cn("h-1 shrink-0", methodStyle(method).dot)} aria-hidden />
			<div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
				<div className="flex items-center gap-1">
					<IconButton
						label="Previous operation (←)"
						className="h-7 w-7"
						onClick={() => onStep(-1)}
					>
						<ChevronLeft className="h-3.5 w-3.5" />
					</IconButton>
					<IconButton
						label="Next operation (→)"
						className="h-7 w-7"
						onClick={() => onStep(1)}
					>
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

			<div className="scroll-ide min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
				<div>
					<div className="flex items-start gap-2">
						<MethodBadge method={method} className="mt-0.5 shrink-0" />
						<p className="min-w-0 break-all font-mono text-xs font-medium text-fg">
							<HighlightedPath path={path} />
						</p>
					</div>
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

				<Section
					title="Request"
					meta={
						request?.body ? `body · ${countSchemaFields(request.body)} fields` : undefined
					}
				>
					{hasRequest ? (
						<div className="space-y-2">
							{paramGroups.map(([group, params]) => (
								<div key={group}>
									<p className="px-1 font-mono text-[10px] uppercase tracking-wide text-muted/80">
										{group}
									</p>
									{Object.entries(params).map(([name, schema]) => (
										<SchemaTree key={name} name={name} schema={schema} openDepth={0} />
									))}
								</div>
							))}
							{request?.body ? (
								<div>
									<p className="px-1 font-mono text-[10px] uppercase tracking-wide text-muted/80">
										body
									</p>
									<SchemaTree name="body" schema={request.body} openDepth={2} />
								</div>
							) : null}
						</div>
					) : (
						<p className="px-1 py-1 text-xs text-muted">No parameters or body.</p>
					)}
				</Section>

				{/* The request → response hop, drawn as a little wire. */}
				<div className="flex items-center gap-2 px-3" aria-hidden>
					<span className="h-6 border-l-2 border-dashed border-accent/50" />
					<span className="font-mono text-[10px] text-muted">server responds</span>
				</div>

				<Section
					title="Response"
					meta={op.response ? `${countSchemaFields(op.response)} fields` : undefined}
				>
					{op.response ? (
						<SchemaTree name="response" schema={op.response} openDepth={2} />
					) : (
						<p className="px-1 py-1 text-xs text-muted">No response schema.</p>
					)}
				</Section>
			</div>
		</aside>
	);
};
