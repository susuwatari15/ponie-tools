import {
	ChevronsDownUp,
	ChevronsUpDown,
	Maximize2,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type { FC, PointerEvent as ReactPointerEvent, RefObject } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/components/ui/cn";
import { HTTP_METHOD_ORDER, methodStyle } from "@/components/ui/methodColors";
import type { PanZoomController } from "../../hooks/usePanZoom";
import type { SpecVisualizerController } from "../../hooks/useSpecVisualizer";
import {
	METHOD_SHORT_LABEL,
	NODE_HEIGHT,
	PILL_WIDTH,
	type LayoutEdge,
	type LayoutNode,
} from "../../lib/specMap";
import { HighlightedPath } from "./HighlightedPath";

const MINIMAP_MAX_WIDTH = 160;
const MINIMAP_MAX_HEIGHT = 96;
/** Below this canvas width the minimap would collide with the toolbar. */
const MINIMAP_MIN_CANVAS_WIDTH = 480;

type SpecRouteMapProps = {
	v: SpecVisualizerController;
	pz: PanZoomController;
	containerRef: RefObject<HTMLDivElement | null>;
	className?: string;
};

const edgePath = ({ from, to }: LayoutEdge): string => {
	const x1 = from.x + from.width;
	const y1 = from.y + NODE_HEIGHT / 2;
	const x2 = to.x;
	const y2 = to.y + NODE_HEIGHT / 2;
	const mid = (x1 + x2) / 2;
	return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
};

/** Thicker wires for busier subtrees — reads like traffic on a transit map. */
const edgeWidth = (edge: LayoutEdge): number =>
	1.25 + Math.min(2.5, Math.log2(edge.to.node.totalOps + 1) * 0.6);

const RouteNode: FC<{ layoutNode: LayoutNode; v: SpecVisualizerController }> = ({
	layoutNode,
	v,
}) => {
	const { node, x, y, width, collapsed } = layoutNode;
	const isRoot = node.parentKey === null;
	const hasChildren = node.children.length > 0;
	const onSelectedTrail = v.selectedTrail.has(node.key);
	const onHoverTrail = v.hoverTrail.has(node.key);
	const holdsSelection = v.selectedOp?.nodeKey === node.key;
	const dimmed = !node.methods.some(v.isMethodFocused);
	const hiddenOps = node.totalOps - node.operations.length;

	const activateLabel = () => {
		if (hasChildren) v.toggleCollapsed(node.key);
		else if (node.operations.length > 0) v.selectOp(node.operations[0].id);
	};

	return (
		<div
			data-pan-ignore
			className={cn(
				"absolute flex items-center gap-2 rounded-md border pl-2.5 pr-1 font-mono text-[11px] shadow-sm transition-[opacity,border-color,box-shadow] duration-150",
				isRoot
					? "border-accent/50 bg-accent/10 text-accent"
					: "border-line bg-surface text-fg",
				onSelectedTrail && !isRoot && "border-accent/70",
				onHoverTrail && !onSelectedTrail && !isRoot && "border-accent/40",
				holdsSelection && "ring-2 ring-accent/30",
				dimmed && "opacity-30",
			)}
			style={{ left: x, top: y, width, height: NODE_HEIGHT }}
			onMouseEnter={() => v.setHoveredKey(node.key)}
			onMouseLeave={() => v.setHoveredKey(null)}
		>
			{!isRoot ? (
				<span
					className={cn(
						"absolute -left-[5px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border bg-surface",
						onSelectedTrail || onHoverTrail ? "border-accent" : "border-muted/50",
					)}
					aria-hidden
				/>
			) : null}

			<button
				type="button"
				onClick={activateLabel}
				className={cn(
					"min-w-0 flex-1 truncate text-left focus-visible:outline-none focus-visible:underline",
					isRoot && "font-semibold",
				)}
				title={isRoot ? node.label : node.key || "/"}
			>
				{isRoot ? node.label : <HighlightedPath path={node.label} />}
			</button>

			{node.operations.length > 0 ? (
				<span className="flex shrink-0 items-center gap-[3px]">
					{node.operations.map((operation) => {
						const selected = v.selectedOp?.id === operation.id;
						const style = methodStyle(operation.method);
						return (
							<button
								key={operation.id}
								type="button"
								onClick={() => v.selectOp(selected ? null : operation.id)}
								title={`${operation.method.toUpperCase()} ${operation.path}${
									operation.op.summary ? ` — ${operation.op.summary}` : ""
								}`}
								aria-pressed={selected}
								className={cn(
									"flex h-[18px] items-center justify-center rounded text-[9px] font-semibold tracking-wide transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
									selected ? style.solid : style.chip,
									!v.isMethodFocused(operation.method) && "opacity-30",
								)}
								style={{ width: PILL_WIDTH }}
							>
								{METHOD_SHORT_LABEL[operation.method]}
							</button>
						);
					})}
				</span>
			) : null}

			{hasChildren ? (
				<button
					type="button"
					onClick={() => v.toggleCollapsed(node.key)}
					aria-label={collapsed ? "Expand branch" : "Collapse branch"}
					aria-expanded={!collapsed}
					title={collapsed ? `Expand (${hiddenOps} hidden)` : "Collapse"}
					className={cn(
						"flex h-[18px] min-w-[22px] shrink-0 items-center justify-center rounded px-1 text-[9px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
						collapsed
							? "bg-accent text-white"
							: "text-muted hover:bg-raised hover:text-fg",
					)}
				>
					{collapsed ? `+${hiddenOps}` : "−"}
				</button>
			) : null}
		</div>
	);
};

const MethodLegend: FC<{ v: SpecVisualizerController }> = ({ v }) => {
	const total = v.operations.length;
	const methods = HTTP_METHOD_ORDER.filter((method) => v.methodCounts.has(method));

	return (
		<div
			data-pan-ignore
			className="absolute left-3 top-3 z-10 max-w-[calc(100%-24px)] overflow-hidden rounded-lg border border-line bg-surface/90 shadow-card backdrop-blur"
		>
			{/* Proportional method spectrum for this selection. */}
			<div className="flex h-1" aria-hidden>
				{methods.map((method) => (
					<span
						key={method}
						className={cn(methodStyle(method).dot, !v.isMethodFocused(method) && "opacity-25")}
						style={{ flexGrow: v.methodCounts.get(method) }}
					/>
				))}
			</div>
			<div className="flex flex-wrap items-center gap-1 px-2 py-1.5">
				<span className="mr-1 font-mono text-[10px] text-muted">
					{total} op{total === 1 ? "" : "s"}
				</span>
				{methods.map((method) => {
					const focused = v.focusedMethods.includes(method);
					return (
						<button
							key={method}
							type="button"
							onClick={() => v.toggleFocusedMethod(method)}
							aria-pressed={focused}
							title={`Highlight ${method.toUpperCase()} routes`}
							className={cn(
								"inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase transition",
								focused ? methodStyle(method).solid : methodStyle(method).chip,
								!v.isMethodFocused(method) && "opacity-40",
							)}
						>
							{METHOD_SHORT_LABEL[method]}
							<span className="font-normal opacity-80">{v.methodCounts.get(method)}</span>
						</button>
					);
				})}
				{v.focusedMethods.length > 0 ? (
					<button
						type="button"
						onClick={v.clearFocusedMethods}
						className="ml-auto font-mono text-[10px] text-muted underline-offset-2 hover:text-fg hover:underline"
					>
						clear
					</button>
				) : null}
			</div>
		</div>
	);
};

const Minimap: FC<{ v: SpecVisualizerController; pz: PanZoomController }> = ({ v, pz }) => {
	const layout = v.layout;
	if (!layout) return null;

	const scale = Math.min(MINIMAP_MAX_WIDTH / layout.width, MINIMAP_MAX_HEIGHT / layout.height);
	const width = Math.max(24, layout.width * scale);
	const height = Math.max(16, layout.height * scale);

	const { x, y, k } = pz.view;
	const viewport = {
		x: (-x / k) * scale,
		y: (-y / k) * scale,
		width: (pz.size.width / k) * scale,
		height: (pz.size.height / k) * scale,
	};

	const jump = (event: ReactPointerEvent<SVGSVGElement>) => {
		const rect = event.currentTarget.getBoundingClientRect();
		pz.centerOn((event.clientX - rect.left) / scale, (event.clientY - rect.top) / scale);
	};

	return (
		<div
			data-pan-ignore
			className="absolute bottom-3 left-3 z-10 rounded-lg border border-line bg-surface/90 p-1.5 shadow-card backdrop-blur"
		>
			<svg
				width={width}
				height={height}
				className="block cursor-crosshair overflow-hidden"
				onPointerDown={(event) => {
					event.currentTarget.setPointerCapture(event.pointerId);
					jump(event);
				}}
				onPointerMove={(event) => {
					if (event.currentTarget.hasPointerCapture(event.pointerId)) jump(event);
				}}
				aria-label="Minimap — click or drag to move the view"
				role="img"
			>
				{layout.nodes.map(({ node, x: nx, y: ny, width: nw }) => (
					<rect
						key={node.key}
						x={nx * scale}
						y={ny * scale}
						width={Math.max(2, nw * scale)}
						height={Math.max(1.5, NODE_HEIGHT * scale)}
						rx={1}
						className={
							v.selectedTrail.has(node.key) ? "fill-accent" : "fill-muted/40"
						}
					/>
				))}
				<rect
					x={viewport.x}
					y={viewport.y}
					width={viewport.width}
					height={viewport.height}
					className="fill-accent/10 stroke-accent"
					strokeWidth={1}
				/>
			</svg>
		</div>
	);
};

export const SpecRouteMap: FC<SpecRouteMapProps> = ({ v, pz, containerRef, className }) => {
	const layout = v.layout;
	const { x, y, k } = pz.view;
	const gridSize = 22 * k;
	const partlyHidden =
		layout !== null &&
		(x < 0 || y < 0 || x + layout.width * k > pz.size.width || y + layout.height * k > pz.size.height);
	const showMinimap = partlyHidden && pz.size.width >= MINIMAP_MIN_CANVAS_WIDTH;

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative min-h-0 touch-none select-none overflow-clip",
				pz.isPanning ? "cursor-grabbing" : "cursor-grab",
				className,
			)}
			style={{
				backgroundImage: "radial-gradient(rgb(var(--muted) / 0.22) 1px, transparent 1px)",
				backgroundSize: `${gridSize}px ${gridSize}px`,
				backgroundPosition: `${x}px ${y}px`,
			}}
			{...pz.panHandlers}
		>
			{layout ? (
				<div
					className="absolute left-0 top-0 origin-top-left"
					style={{
						transform: `translate(${x}px, ${y}px) scale(${k})`,
						width: layout.width,
						height: layout.height,
					}}
				>
					<svg
						className="pointer-events-none absolute left-0 top-0 overflow-visible"
						width={layout.width}
						height={layout.height}
						aria-hidden
					>
						{layout.edges.map((edge) => {
							const lit =
								v.selectedTrail.has(edge.to.node.key) || v.hoverTrail.has(edge.to.node.key);
							const dimmed = !edge.to.node.methods.some(v.isMethodFocused);
							return (
								<path
									key={edge.to.node.key}
									d={edgePath(edge)}
									fill="none"
									strokeWidth={edgeWidth(edge)}
									strokeLinecap="round"
									className={cn(
										"transition-[stroke,opacity] duration-150",
										lit ? "spec-edge-flow stroke-accent" : "stroke-muted/35",
										dimmed && "opacity-25",
									)}
								/>
							);
						})}
					</svg>
					{layout.nodes.map((layoutNode) => (
						<RouteNode key={layoutNode.node.key} layoutNode={layoutNode} v={v} />
					))}
				</div>
			) : null}

			<MethodLegend v={v} />

			{showMinimap ? <Minimap v={v} pz={pz} /> : null}

			<div
				data-pan-ignore
				className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-line bg-surface/90 p-1 shadow-card backdrop-blur"
			>
				<IconButton label="Zoom out (−)" className="h-7 w-7" onClick={() => pz.zoomAt(1 / 1.2)}>
					<ZoomOut className="h-3.5 w-3.5" />
				</IconButton>
				<button
					type="button"
					onClick={() => pz.zoomAt(1 / k)}
					title="Reset to 100%"
					className="w-11 rounded font-mono text-[10px] text-muted transition hover:text-fg"
				>
					{Math.round(k * 100)}%
				</button>
				<IconButton label="Zoom in (+)" className="h-7 w-7" onClick={() => pz.zoomAt(1.2)}>
					<ZoomIn className="h-3.5 w-3.5" />
				</IconButton>
				<IconButton
					label="Fit to view (0)"
					className="h-7 w-7"
					onClick={() => layout && pz.fitTo(layout.width, layout.height)}
				>
					<Maximize2 className="h-3.5 w-3.5" />
				</IconButton>
				<span className="mx-0.5 h-4 w-px bg-line" aria-hidden />
				<IconButton label="Expand all" className="h-7 w-7" onClick={v.expandAll}>
					<ChevronsUpDown className="h-3.5 w-3.5" />
				</IconButton>
				<IconButton label="Collapse to resources" className="h-7 w-7" onClick={v.collapseAll}>
					<ChevronsDownUp className="h-3.5 w-3.5" />
				</IconButton>
			</div>
		</div>
	);
};
