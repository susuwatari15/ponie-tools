import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export type PanZoomView = { x: number; y: number; k: number };

const MIN_SCALE = 0.2;
const MAX_SCALE = 2.5;
const FIT_PADDING = 32;
/** Fitting never shrinks text below this; the rest is reachable by panning. */
const MIN_FIT_SCALE = 0.7;

const clampScale = (k: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, k));

/**
 * Pan/zoom state for a DOM canvas. Plain wheel pans, Ctrl/⌘ + wheel (or a
 * trackpad pinch) zooms around the cursor, and dragging the background pans.
 */
export function usePanZoom(containerRef: RefObject<HTMLDivElement | null>) {
	const [view, setView] = useState<PanZoomView>({ x: FIT_PADDING, y: FIT_PADDING, k: 1 });
	const [size, setSize] = useState({ width: 0, height: 0 });
	const [isPanning, setIsPanning] = useState(false);
	const dragRef = useRef<{ pointerId: number; startX: number; startY: number; view: PanZoomView } | null>(null);

	useEffect(() => {
		const element = containerRef.current;
		if (!element) return;
		const observer = new ResizeObserver(([entry]) => {
			setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, [containerRef]);

	const zoomAt = useCallback((factor: number, originX?: number, originY?: number) => {
		setView((previous) => {
			const element = containerRef.current;
			const ox = originX ?? (element ? element.clientWidth / 2 : 0);
			const oy = originY ?? (element ? element.clientHeight / 2 : 0);
			const k = clampScale(previous.k * factor);
			const ratio = k / previous.k;
			return { k, x: ox - (ox - previous.x) * ratio, y: oy - (oy - previous.y) * ratio };
		});
	}, [containerRef]);

	// React registers wheel listeners as passive, so preventDefault needs a native one.
	useEffect(() => {
		const element = containerRef.current;
		if (!element) return;
		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
			if (event.ctrlKey || event.metaKey) {
				const rect = element.getBoundingClientRect();
				zoomAt(Math.exp(-event.deltaY * 0.01), event.clientX - rect.left, event.clientY - rect.top);
				return;
			}
			setView((previous) => ({ ...previous, x: previous.x - event.deltaX, y: previous.y - event.deltaY }));
		};
		element.addEventListener("wheel", onWheel, { passive: false });
		return () => element.removeEventListener("wheel", onWheel);
	}, [containerRef, zoomAt]);

	const fitTo = useCallback((width: number, height: number) => {
		const element = containerRef.current;
		if (!element || width <= 0 || height <= 0) return;
		const availableWidth = element.clientWidth - FIT_PADDING * 2;
		const availableHeight = element.clientHeight - FIT_PADDING * 2;
		const k = clampScale(
			Math.max(MIN_FIT_SCALE, Math.min(availableWidth / width, availableHeight / height, 1.1)),
		);
		// Too wide to fit: pin the left edge so the root stays on screen.
		setView({
			k,
			x: width * k > availableWidth ? FIT_PADDING : (element.clientWidth - width * k) / 2,
			y: (element.clientHeight - height * k) / 2,
		});
	}, [containerRef]);

	/** Pan so the given canvas point sits in the middle of the viewport. */
	const centerOn = useCallback((canvasX: number, canvasY: number) => {
		const element = containerRef.current;
		if (!element) return;
		setView((previous) => ({
			...previous,
			x: element.clientWidth / 2 - canvasX * previous.k,
			y: element.clientHeight / 2 - canvasY * previous.k,
		}));
	}, [containerRef]);

	const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;
		if ((event.target as Element).closest("[data-pan-ignore]")) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, view };
		setIsPanning(true);
	};

	const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		setView({
			...drag.view,
			x: drag.view.x + event.clientX - drag.startX,
			y: drag.view.y + event.clientY - drag.startY,
		});
	};

	const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (dragRef.current?.pointerId !== event.pointerId) return;
		dragRef.current = null;
		setIsPanning(false);
	};

	return {
		view,
		setView,
		size,
		isPanning,
		zoomAt,
		fitTo,
		centerOn,
		panHandlers: {
			onPointerDown,
			onPointerMove,
			onPointerUp,
			onPointerCancel: onPointerUp,
		},
	};
}

export type PanZoomController = ReturnType<typeof usePanZoom>;
