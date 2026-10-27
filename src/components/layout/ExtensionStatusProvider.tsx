"use client";

import {
	createContext,
	type FC,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { type ExtensionInfo, getExtensionInfo } from "@/lib/swaggerExtensionBridge";

export type ExtensionStatus = "checking" | "connected" | "missing";

type ExtensionStatusContextValue = {
	status: ExtensionStatus;
	/** Shorthand for `status === "connected"`. */
	available: boolean;
	/** What the extension reported on the last successful ping. */
	info: ExtensionInfo | null;
	/** Probes again now; resolves once the answer (or timeout) is in. */
	recheck: () => Promise<void>;
};

const ExtensionStatusContext = createContext<ExtensionStatusContextValue | null>(null);

/**
 * Probes the companion Chrome extension once on mount and again whenever the
 * window regains focus (it may have been installed or reloaded meanwhile), so
 * the header badge and every tool page share one answer.
 */
export const ExtensionStatusProvider: FC<{ children: ReactNode }> = ({ children }) => {
	const [status, setStatus] = useState<ExtensionStatus>("checking");
	const [info, setInfo] = useState<ExtensionInfo | null>(null);
	/** Drops answers from probes that a newer one has overtaken. */
	const probeRun = useRef(0);

	const recheck = useCallback(async () => {
		const run = ++probeRun.current;
		const next = await getExtensionInfo();
		if (run !== probeRun.current) return;
		setInfo(next);
		setStatus(next ? "connected" : "missing");
	}, []);

	useEffect(() => {
		void recheck();
		const onFocus = () => void recheck();
		window.addEventListener("focus", onFocus);
		return () => {
			window.removeEventListener("focus", onFocus);
			// Ignore a probe still in flight after unmount.
			probeRun.current += 1;
		};
	}, [recheck]);

	const value = useMemo(
		() => ({ status, available: status === "connected", info, recheck }),
		[status, info, recheck],
	);

	return (
		<ExtensionStatusContext.Provider value={value}>{children}</ExtensionStatusContext.Provider>
	);
};

export function useExtensionStatus(): ExtensionStatusContextValue {
	const ctx = useContext(ExtensionStatusContext);
	if (!ctx) throw new Error("useExtensionStatus must be used within ExtensionStatusProvider");
	return ctx;
}
