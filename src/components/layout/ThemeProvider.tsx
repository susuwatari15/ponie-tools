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
	const [resolvedTheme, setResolvedThemeState] = useState<ResolvedTheme>(() =>
		readStoredResolvedTheme(),
	);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
	}, [resolvedTheme]);

	const setResolvedTheme = useCallback((theme: ResolvedTheme) => {
		window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
		setResolvedThemeState(theme);
	}, []);

	const toggleTheme = useCallback(() => {
		setResolvedTheme(resolvedTheme === "dark" ? "light" : "dark");
	}, [resolvedTheme, setResolvedTheme]);

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
