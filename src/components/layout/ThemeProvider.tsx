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
import {
	type ResolvedTheme,
	readStoredResolvedTheme,
	APP_THEME_STORAGE_KEY,
} from "../../constants/theme-storage";

type ThemeContextValue = {
	resolvedTheme: ResolvedTheme;
	setResolvedTheme: (theme: ResolvedTheme) => void;
	toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
	// Start from a fixed value so the server and the first client render agree
	// (localStorage isn't available on the server). The real theme is adopted
	// right after mount — the pre-paint script has already set the <html> class,
	// so there's no visual flash, only a state catch-up.
	const [resolvedTheme, setResolvedThemeState] = useState<ResolvedTheme>("dark");

	useEffect(() => {
		setResolvedThemeState(readStoredResolvedTheme());
	}, []);

	const setResolvedTheme = useCallback((theme: ResolvedTheme) => {
		window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
		setResolvedThemeState(theme);
	}, []);

	const toggleTheme = useCallback(() => {
		setResolvedThemeState((prev) => {
			const next: ResolvedTheme = prev === "dark" ? "light" : "dark";
			window.localStorage.setItem(APP_THEME_STORAGE_KEY, next);
			document.documentElement.classList.toggle("dark", next === "dark");
			return next;
		});
	}, []);

	const value = useMemo(
		() => ({
			resolvedTheme,
			setResolvedTheme,
			toggleTheme,
		}),
		[resolvedTheme, setResolvedTheme, toggleTheme],
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) {
		throw new Error("useTheme must be used within ThemeProvider");
	}
	return ctx;
}
