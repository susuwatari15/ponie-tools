"use client";

import type { FC, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "./cn";

export type PopoverProps = {
	/** Renders the toggle; spread `triggerProps` onto the button. */
	trigger: (state: {
		open: boolean;
		triggerProps: {
			onClick: () => void;
			"aria-expanded": boolean;
			"aria-haspopup": "dialog";
		};
	}) => ReactNode;
	children: (close: () => void) => ReactNode;
	/** Accessible name of the panel. */
	label: string;
	align?: "start" | "end";
	className?: string;
	panelClassName?: string;
};

/** An anchored panel that closes on outside click or `Esc`. */
export const Popover: FC<PopoverProps> = ({
	trigger,
	children,
	label,
	align = "end",
	className,
	panelClassName,
}) => {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const close = () => setOpen(false);

	return (
		<div ref={rootRef} className={cn("relative inline-flex", className)}>
			{trigger({
				open,
				triggerProps: {
					onClick: () => setOpen((value) => !value),
					"aria-expanded": open,
					"aria-haspopup": "dialog",
				},
			})}
			{open ? (
				<div
					role="dialog"
					aria-label={label}
					className={cn(
						"absolute top-full z-40 mt-1.5 w-72 rounded-lg border border-line bg-surface p-2 shadow-glow",
						align === "end" ? "right-0" : "left-0",
						panelClassName,
					)}
				>
					{children(close)}
				</div>
			) : null}
		</div>
	);
};
