"use client";

import { useEffect, useRef, type FC, type KeyboardEvent } from "react";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { HTTP_METHOD_ORDER } from "@/components/ui/methodColors";
import { useSpecBricks, type BrickSortMode, type SpecBricksController } from "../../hooks/useSpecBricks";
import { METHOD_SHORT_LABEL, type SpecOperation, type SpecPlate } from "../../lib/specBricks";
import { Brick, METHOD_BRICK_TONES, STUD_PITCH } from "./Brick";
import { HighlightedPath } from "./HighlightedPath";
import { SpecOperationInspector } from "./SpecOperationInspector";

const SORT_OPTIONS: { value: BrickSortMode; label: string }[] = [
	{ value: "path", label: "A–Z" },
	{ value: "size", label: "Biggest" },
];

/** Path params on plastic: keep the brick's ink, mark with a dotted underline. */
const BRICK_PARAM_CLASS = "underline decoration-dotted decoration-2 underline-offset-2";

/** Bricks drop onto the plates one after another, capped so big specs don't crawl. */
const dropDelay = (order: number) => `${Math.min(order, 40) * 22}ms`;

const OperationBrick: FC<{
	operation: SpecOperation;
	order: number;
	b: SpecBricksController;
}> = ({ operation, order, b }) => {
	const selected = b.selectedOp?.id === operation.id;
	const focused = b.isMethodFocused(operation.method);

	return (
		<button
			type="button"
			data-brick-id={operation.id}
			onClick={() => b.selectOp(selected ? null : operation.id)}
			aria-pressed={selected}
			title={`${operation.method.toUpperCase()} ${operation.path}${
				operation.op.summary ? ` — ${operation.op.summary}` : ""
			}\n${operation.fieldCount} fields · ${operation.studs}-stud brick`}
			className={cn(
				"brick-drop max-w-full rounded-[5px] text-left transition duration-150 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
				selected && "-translate-y-1.5",
				!focused && "opacity-25 grayscale hover:opacity-60",
			)}
			style={{ animationDelay: dropDelay(order) }}
		>
			<Brick
				tone={METHOD_BRICK_TONES[operation.method]}
				studs={operation.studs}
				width={operation.studs * STUD_PITCH}
				className="max-w-full"
				bodyClassName={cn(
					"px-2 pb-2 pt-1 transition-shadow",
					selected && "ring-2 ring-fg/80 ring-offset-2 ring-offset-raised",
				)}
			>
				<span className="block font-mono text-[9px] font-black tracking-wider opacity-80">
					{METHOD_SHORT_LABEL[operation.method]}
				</span>
				<span className="line-clamp-2 break-words font-mono text-[11px] font-semibold leading-4">
					<HighlightedPath path={operation.localPath} paramClassName={BRICK_PARAM_CLASS} />
					{operation.localPath === "/" && operation.op.summary ? (
						<span className="ml-1 font-sans font-normal opacity-75">{operation.op.summary}</span>
					) : null}
				</span>
			</Brick>
		</button>
	);
};

const Baseplate: FC<{ plate: SpecPlate; startOrder: number; b: SpecBricksController }> = ({
	plate,
	startOrder,
	b,
}) => (
	<section
		className="rounded-xl border border-line bg-raised p-3 pt-2 shadow-[inset_0_-3px_0_rgb(var(--line))]"
		style={{
			backgroundImage: "radial-gradient(circle, rgb(var(--line)) 2.5px, transparent 3px)",
			backgroundSize: "14px 14px",
			backgroundPosition: "4px 4px",
		}}
	>
		<header className="mb-2 flex items-center gap-2">
			<span className="min-w-0 truncate rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-[11px] font-semibold text-fg shadow-sm">
				<HighlightedPath path={plate.key} />
			</span>
			<span className="ml-auto shrink-0 rounded bg-surface/80 px-1 font-mono text-[10px] text-muted">
				{plate.operations.length} {plate.operations.length === 1 ? "brick" : "bricks"}
			</span>
		</header>
		<div className="flex flex-wrap items-end gap-x-2 gap-y-3">
			{plate.operations.map((operation, index) => (
				<OperationBrick
					key={operation.id}
					operation={operation}
					order={startOrder + index}
					b={b}
				/>
			))}
		</div>
	</section>
);

type SpecBrickViewProps = {
	minifiedOutput: string;
	onDeselectEndpoint?: (id: string) => void;
	className?: string;
};

/** LEGO-style view: endpoints are bricks on per-resource baseplates. */
export const SpecBrickView: FC<SpecBrickViewProps> = ({
	minifiedOutput,
	onDeselectEndpoint,
	className,
}) => {
	const b = useSpecBricks(minifiedOutput);
	const scrollRef = useRef<HTMLDivElement>(null);
	const selectedId = b.selectedOp?.id ?? null;

	// Keep the selected brick on screen while stepping with ←/→.
	useEffect(() => {
		if (!selectedId) return;
		const element = scrollRef.current?.querySelector(`[data-brick-id="${CSS.escape(selectedId)}"]`);
		element?.scrollIntoView({ block: "nearest", inline: "nearest" });
	}, [selectedId]);

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		if (event.key === "ArrowRight") b.stepSelection(1);
		else if (event.key === "ArrowLeft") b.stepSelection(-1);
		else if (event.key === "Escape" && b.selectedOp) b.selectOp(null);
		else return;
		event.preventDefault();
	};

	if (b.operations.length === 0) {
		return (
			<EmptyState
				title="No bricks to build"
				description="The compressed spec has no operations."
				className={cn("h-full", className)}
			/>
		);
	}

	const methods = HTTP_METHOD_ORDER.filter((method) => b.methodCounts.has(method));
	let order = 0;

	return (
		<div
			tabIndex={0}
			onKeyDown={onKeyDown}
			className={cn(
				"relative flex min-h-[480px] overflow-hidden rounded-lg border border-line bg-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 dark:bg-ink/60",
				className,
			)}
			aria-label="Brick view. Arrow keys step through bricks, Escape closes the instructions."
		>
			<div className="flex min-w-0 flex-1 flex-col">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface/70 px-3 py-2">
					<div className="flex flex-wrap items-end gap-1.5">
						{methods.map((method) => {
							const active = b.focusedMethods.includes(method);
							return (
								<button
									key={method}
									type="button"
									onClick={() => b.toggleFocusedMethod(method)}
									aria-pressed={active}
									title={`Highlight ${method.toUpperCase()} bricks`}
									className={cn(
										"rounded-[5px] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
										active && "-translate-y-0.5",
										!b.isMethodFocused(method) && "opacity-35 grayscale",
									)}
								>
									<Brick
										tone={METHOD_BRICK_TONES[method]}
										studs={2}
										bodyClassName={cn(
											"px-1.5 pb-1 pt-0.5 font-mono text-[10px] font-bold",
											active && "ring-2 ring-fg/80 ring-offset-1 ring-offset-surface",
										)}
									>
										{METHOD_SHORT_LABEL[method]} ×{b.methodCounts.get(method)}
									</Brick>
								</button>
							);
						})}
						{b.focusedMethods.length > 0 ? (
							<button
								type="button"
								onClick={b.clearFocusedMethods}
								className="self-center font-mono text-[10px] text-muted underline-offset-2 hover:text-fg hover:underline"
							>
								clear
							</button>
						) : null}
					</div>
					<div className="ml-auto flex items-center gap-2">
						<span className="hidden font-mono text-[10px] text-muted md:inline">
							{b.operations.length} bricks · {b.plates.length} plates · {b.totalStuds} studs
						</span>
						<div
							className="inline-flex rounded-md border border-line bg-raised/60 p-0.5"
							role="radiogroup"
							aria-label="Sort bricks"
						>
							{SORT_OPTIONS.map(({ value, label }) => (
								<button
									key={value}
									type="button"
									role="radio"
									aria-checked={b.sortMode === value}
									onClick={() => b.setSortMode(value)}
									className={cn(
										"rounded px-2 py-0.5 text-[11px] font-medium transition",
										b.sortMode === value ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
									)}
								>
									{label}
								</button>
							))}
						</div>
					</div>
				</div>

				<div ref={scrollRef} className="scroll-ide min-h-0 flex-1 overflow-y-auto p-3">
					<div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-3">
						{b.plates.map((plate) => {
							const startOrder = order;
							order += plate.operations.length;
							return (
								<Baseplate
									key={`${b.sortMode}-${plate.key}`}
									plate={plate}
									startOrder={startOrder}
									b={b}
								/>
							);
						})}
					</div>
				</div>

				<p className="border-t border-line px-3 py-1.5 font-mono text-[10px] text-muted">
					wider brick = more fields · click a brick for build instructions · ←/→ step
				</p>
			</div>

			{b.selectedOp ? (
				<SpecOperationInspector
					key={b.selectedOp.id}
					operation={b.selectedOp}
					index={b.selectedIndex}
					total={b.operations.length}
					onStep={b.stepSelection}
					onClose={() => b.selectOp(null)}
					onDeselect={onDeselectEndpoint}
					className="spec-inspector-enter absolute inset-0 z-20 sm:static sm:z-auto sm:w-[min(360px,55%)] sm:shrink-0 sm:border-l sm:border-line"
				/>
			) : null}
		</div>
	);
};
