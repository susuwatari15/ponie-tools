"use client";

import {
	createContext,
	type FC,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

const SIDEBAR_STORAGE_KEY = "ponie-sidebar-collapsed";

type SidebarContextValue = {
	/** Desktop: sidebar column collapsed (hidden). */
	collapsed: boolean;
	setCollapsed: (collapsed: boolean) => void;
	toggleSidebar: () => void;
	/** Mobile: slide-over drawer open. */
	mobileOpen: boolean;
	openMobile: () => void;
	closeMobile: () => void;
	toggleMobile: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readStoredCollapsed(): boolean {
	if (typeof window === "undefined") return false;
	try {
		return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
	} catch {
		return false;
	}
}

export const SidebarProvider: FC<{ children: ReactNode }> = ({ children }) => {
	const [collapsed, setCollapsedState] = useState<boolean>(() =>
		readStoredCollapsed(),
	);
	const [mobileOpen, setMobileOpen] = useState(false);

	const setCollapsed = useCallback((next: boolean) => {
		setCollapsedState(next);
		try {
			window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
		} catch {
			// storage unavailable
		}
	}, []);

	const toggleSidebar = useCallback(() => {
		setCollapsed(!collapsed);
	}, [collapsed, setCollapsed]);

	const openMobile = useCallback(() => setMobileOpen(true), []);
	const closeMobile = useCallback(() => setMobileOpen(false), []);
	const toggleMobile = useCallback(() => setMobileOpen((v) => !v), []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
				event.preventDefault();
				toggleSidebar();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [toggleSidebar]);

	const value = useMemo(
		() => ({
			collapsed,
			setCollapsed,
			toggleSidebar,
			mobileOpen,
			openMobile,
			closeMobile,
			toggleMobile,
		}),
		[collapsed, setCollapsed, toggleSidebar, mobileOpen, openMobile, closeMobile, toggleMobile],
	);

	return (
		<SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
	);
};

export function useSidebar(): SidebarContextValue {
	const ctx = useContext(SidebarContext);
	if (!ctx) {
		throw new Error("useSidebar must be used within SidebarProvider");
	}
	return ctx;
}
