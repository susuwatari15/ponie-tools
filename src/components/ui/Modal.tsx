"use client";

import { X } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { IconButton } from "./IconButton";

export type ModalProps = {
	open: boolean;
	onClose: () => void;
	title?: ReactNode;
	eyebrow?: string;
	children: ReactNode;
	footer?: ReactNode;
	className?: string;
	/** Max width utility, defaults to a comfortable dialog size. */
	widthClassName?: string;
};

export const Modal: FC<ModalProps> = ({
	open,
	onClose,
	title,
	eyebrow,
	children,
	footer,
	className,
	widthClassName = "max-w-lg",
}) => {
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		// Move focus into the dialog.
		panelRef.current?.focus();
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prevOverflow;
		};
	}, [open, onClose]);

	if (!open || typeof document === "undefined") return null;

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-sm sm:items-center"
			role="dialog"
			aria-modal="true"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				ref={panelRef}
				tabIndex={-1}
				className={cn(
					"w-full rounded-card border border-line bg-surface shadow-glow outline-none",
					widthClassName,
					className,
				)}
			>
				{title ? (
					<div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
						<div className="min-w-0">
							{eyebrow ? (
								<p className="font-mono text-[10px] uppercase tracking-widest text-muted">
									{eyebrow}
								</p>
							) : null}
							<h2 className="text-sm font-semibold text-fg">{title}</h2>
						</div>
						<IconButton label="Close" onClick={onClose}>
							<X className="h-4 w-4" />
						</IconButton>
					</div>
				) : null}
				<div className="px-4 py-4">{children}</div>
				{footer ? (
					<div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
						{footer}
					</div>
				) : null}
			</div>
		</div>,
		document.body,
	);
};
