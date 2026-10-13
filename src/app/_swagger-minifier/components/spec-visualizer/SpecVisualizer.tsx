"use client";

import { useEffect, useRef, type FC, type KeyboardEvent } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/components/ui/cn";
import { usePanZoom } from "../../hooks/usePanZoom";
import { useSpecVisualizer } from "../../hooks/useSpecVisualizer";
import { NODE_HEIGHT } from "../../lib/specMap";
import { SpecOperationInspector } from "./SpecOperationInspector";
import { SpecRouteMap } from "./SpecRouteMap";

type SpecVisualizerProps = {
	minifiedOutput: string;
	onDeselectEndpoint?: (id: string) => void;
	className?: string;
};

/** Interactive route map of the minified spec with an operation inspector. */
export const SpecVisualizer: FC<SpecVisualizerProps> = ({
	minifiedOutput,
	onDeselectEndpoint,
	className,
}) => {
	const v = useSpecVisualizer(minifiedOutput);
	const containerRef = useRef<HTMLDivElement>(null);
	const pz = usePanZoom(containerRef);
	const { fitTo, centerOn } = pz;

	// Re-fit when the spec changes or on bulk expand/collapse — not on single toggles.
	const fittedForRef = useRef<string | null>(null);
	useEffect(() => {
		if (!v.layout || pz.size.width === 0) return;
		const fitKey = `${v.fitToken}|${minifiedOutput}`;
		if (fittedForRef.current === fitKey) return;
		fittedForRef.current = fitKey;
		fitTo(v.layout.width, v.layout.height);
	}, [minifiedOutput, v.fitToken, v.layout, pz.size.width, fitTo]);

	// Bring the selected node into view if stepping (or the inspector opening) hid it.
	const revealedForRef = useRef<string | null>(null);
	useEffect(() => {
		const operation = v.selectedOp;
		const target = operation ? v.layout?.byKey.get(operation.nodeKey) : undefined;
		if (!operation || !target || pz.size.width === 0) return;
		const revealKey = `${operation.id}|${pz.size.width}|${pz.size.height}`;
		if (revealedForRef.current === revealKey) return;
		revealedForRef.current = revealKey;

		const { x, y, k } = pz.view;
		const left = x + target.x * k;
		const top = y + target.y * k;
		const outOfView =
			left < 0 ||
			top < 0 ||
			left + target.width * k > pz.size.width ||
			top + NODE_HEIGHT * k > pz.size.height;
		if (outOfView) centerOn(target.x + target.width / 2, target.y + NODE_HEIGHT / 2);
	}, [v.selectedOp, v.layout, pz.size, pz.view, centerOn]);

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		const handled = (() => {
			switch (event.key) {
				case "Escape":
					if (!v.selectedOp) return false;
					v.selectOp(null);
					return true;
				case "ArrowRight":
					v.stepSelection(1);
					return true;
				case "ArrowLeft":
					v.stepSelection(-1);
					return true;
				case "+":
				case "=":
					pz.zoomAt(1.2);
					return true;
				case "-":
					pz.zoomAt(1 / 1.2);
					return true;
				case "0":
					if (v.layout) fitTo(v.layout.width, v.layout.height);
					return true;
				default:
					return false;
			}
		})();
		if (handled) event.preventDefault();
	};

	if (!v.layout || v.operations.length === 0) {
		return (
			<EmptyState
				title="Nothing to visualize"
				description="The compressed spec has no operations to map."
				className={cn("h-full", className)}
			/>
		);
	}

	return (
		<div
			tabIndex={0}
			onKeyDown={onKeyDown}
			className={cn(
				"relative flex min-h-[480px] overflow-clip rounded-lg border border-line bg-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 dark:bg-ink/60",
				className,
			)}
			aria-label="API route map. Arrow keys step through operations, plus and minus zoom, 0 fits the view."
		>
			<SpecRouteMap v={v} pz={pz} containerRef={containerRef} className="min-w-0 flex-1" />
			{v.selectedOp ? (
				<SpecOperationInspector
					key={v.selectedOp.id}
					operation={v.selectedOp}
					index={v.selectedIndex}
					total={v.operations.length}
					onStep={v.stepSelection}
					onClose={() => v.selectOp(null)}
					onDeselect={onDeselectEndpoint}
					className="spec-inspector-enter absolute inset-0 z-20 sm:static sm:z-auto sm:w-[min(360px,55%)] sm:shrink-0 sm:border-l sm:border-line"
				/>
			) : null}
		</div>
	);
};
