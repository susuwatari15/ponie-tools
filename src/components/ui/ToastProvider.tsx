"use client";

import { Check, Info, TriangleAlert, X } from "lucide-react";
import {
	createContext,
	type FC,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "./cn";

type ToastTone = "success" | "error" | "info";

type Toast = {
	id: number;
	message: string;
	tone: ToastTone;
};

type ToastContextValue = {
	toast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneConfig: Record<
	ToastTone,
	{ icon: typeof Check; className: string; iconClass: string }
> = {
	success: {
		icon: Check,
		className: "border-emerald-500/30",
		iconClass: "text-emerald-500",
	},
	error: {
		icon: TriangleAlert,
		className: "border-del/40",
		iconClass: "text-del",
	},
	info: { icon: Info, className: "border-line", iconClass: "text-accent" },
};

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
	const [toasts, setToasts] = useState<Toast[]>([]);
	const nextId = useRef(1);

	const dismiss = useCallback((id: number) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const toast = useCallback(
		(message: string, tone: ToastTone = "success") => {
			const id = nextId.current++;
			setToasts((prev) => [...prev, { id, message, tone }]);
			window.setTimeout(() => dismiss(id), 2600);
		},
		[dismiss],
	);

	const value = useMemo(() => ({ toast }), [toast]);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<div
				className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-xs flex-col gap-2"
				aria-live="polite"
				aria-atomic="false"
			>
				{toasts.map((t) => {
					const { icon: Icon, className, iconClass } = toneConfig[t.tone];
					return (
						<div
							key={t.id}
							role="status"
							className={cn(
								"pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-surface px-3 py-2.5 text-sm text-fg shadow-glow",
								className,
							)}
						>
							<Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} aria-hidden />
							<span className="min-w-0 flex-1">{t.message}</span>
							<button
								type="button"
								onClick={() => dismiss(t.id)}
								aria-label="Dismiss"
								className="shrink-0 text-muted transition hover:text-fg"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</div>
					);
				})}
			</div>
		</ToastContext.Provider>
	);
};

export function useToast(): ToastContextValue {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used within ToastProvider");
	return ctx;
}
