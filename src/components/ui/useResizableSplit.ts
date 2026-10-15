import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEvent,
	type PointerEvent,
} from "react";

export type UseResizableSplitOptions = {
	/** localStorage key the chosen size is remembered under. */
	storageKey: string;
	/** CSS custom property (e.g. `--input-width`) set on the container. */
	cssVar: `--${string}`;
	/** Pane size as a percentage of the container width. */
	defaultPercent: number;
	minPercent: number;
	maxPercent: number;
	/** Which container edge the resized pane is attached to. */
	anchor?: "start" | "end";
	/** Percentage moved per arrow-key press. */
	keyboardStep?: number;
};

export type ResizeHandleProps = {
	onPointerDown: (event: PointerEvent<HTMLElement>) => void;
	onPointerMove: (event: PointerEvent<HTMLElement>) => void;
	onPointerUp: (event: PointerEvent<HTMLElement>) => void;
	onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
	onDoubleClick: () => void;
	dragging: boolean;
	valueNow: number;
	valueMin: number;
	valueMax: number;
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Drag-to-resize state for a two-pane split. The pane size is exposed as a CSS
 * custom property on the container so layouts stay in Tailwind; while dragging
 * the property is written straight to the DOM to avoid re-rendering heavy panes
 * on every pointer move, and the final size is committed and persisted on release.
 */
export const useResizableSplit = <T extends HTMLElement = HTMLDivElement>({
	storageKey,
	cssVar,
	defaultPercent,
	minPercent,
	maxPercent,
	anchor = "start",
	keyboardStep = 2,
}: UseResizableSplitOptions) => {
	const containerRef = useRef<T>(null);
	const [percent, setPercentState] = useState(defaultPercent);
	const [dragging, setDragging] = useState(false);
	const dragRef = useRef<{ grabOffset: number; latest: number } | null>(null);

	// Restore after mount — localStorage isn't available during SSR.
	useEffect(() => {
		try {
			const stored = Number(window.localStorage.getItem(storageKey));
			if (stored) setPercentState(clamp(stored, minPercent, maxPercent));
		} catch {
			// storage unavailable
		}
	}, [storageKey, minPercent, maxPercent]);

	const setPercent = useCallback(
		(next: number) => {
			const value = round(clamp(next, minPercent, maxPercent));
			setPercentState(value);
			try {
				window.localStorage.setItem(storageKey, String(value));
			} catch {
				// storage unavailable
			}
		},
		[storageKey, minPercent, maxPercent],
	);

	const pointerPercent = (clientX: number) => {
		const rect = containerRef.current?.getBoundingClientRect();
		if (!rect || rect.width === 0) return null;
		const offset = anchor === "start" ? clientX - rect.left : rect.right - clientX;
		return (offset / rect.width) * 100;
	};

	const endDrag = (event: PointerEvent<HTMLElement>) => {
		const drag = dragRef.current;
		if (!drag) return;
		dragRef.current = null;
		setDragging(false);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		document.documentElement.style.removeProperty("cursor");
		document.body.style.removeProperty("user-select");
		setPercent(drag.latest);
	};

	const handleProps: ResizeHandleProps = {
		onPointerDown: (event) => {
			if (event.button !== 0) return;
			const at = pointerPercent(event.clientX);
			if (at === null) return;
			event.preventDefault();
			event.currentTarget.setPointerCapture(event.pointerId);
			dragRef.current = { grabOffset: at - percent, latest: percent };
			setDragging(true);
			document.documentElement.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
		},
		onPointerMove: (event) => {
			const drag = dragRef.current;
			const at = pointerPercent(event.clientX);
			if (!drag || at === null) return;
			drag.latest = round(clamp(at - drag.grabOffset, minPercent, maxPercent));
			containerRef.current?.style.setProperty(cssVar, `${drag.latest}%`);
		},
		onPointerUp: endDrag,
		onPointerCancel: endDrag,
		onKeyDown: (event) => {
			if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
			// Keep arrows from reaching parent shortcuts (e.g. brick stepping).
			event.preventDefault();
			event.stopPropagation();
			const towardEnd = event.key === "ArrowRight";
			const grows = anchor === "start" ? towardEnd : !towardEnd;
			setPercent(percent + (grows ? keyboardStep : -keyboardStep));
		},
		onDoubleClick: () => setPercent(defaultPercent),
		dragging,
		valueNow: Math.round(percent),
		valueMin: minPercent,
		valueMax: maxPercent,
	};

	const containerStyle = { [cssVar]: `${percent}%` } as CSSProperties;

	return { containerRef, containerStyle, handleProps, percent };
};
