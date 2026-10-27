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
	DEFAULT_DENSITY,
	type Density,
	readStoredDensity,
	writeStoredDensity,
} from "../../constants/preferences-storage";

type PreferencesContextValue = {
	/** List density: `compact` trims padding and font size in long lists. */
	density: Density;
	setDensity: (density: Density) => void;
	toggleDensity: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

/** UI preferences other than the theme (see `ThemeProvider`), persisted per viewer. */
export const PreferencesProvider: FC<{ children: ReactNode }> = ({ children }) => {
	// Same SSR rule as the theme: start from the default so the server and the
	// first client render agree, then adopt the stored value after mount.
	const [density, setDensityState] = useState<Density>(DEFAULT_DENSITY);

	useEffect(() => {
		setDensityState(readStoredDensity());
	}, []);

	const setDensity = useCallback((next: Density) => {
		writeStoredDensity(next);
		setDensityState(next);
	}, []);

	const toggleDensity = useCallback(() => {
		setDensityState((prev) => {
			const next: Density = prev === "compact" ? "comfortable" : "compact";
			writeStoredDensity(next);
			return next;
		});
	}, []);

	const value = useMemo(
		() => ({ density, setDensity, toggleDensity }),
		[density, setDensity, toggleDensity],
	);

	return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export function usePreferences(): PreferencesContextValue {
	const ctx = useContext(PreferencesContext);
	if (!ctx) {
		throw new Error("usePreferences must be used within PreferencesProvider");
	}
	return ctx;
}

/** Current list density; falls back to the default outside the provider. */
export function useDensity(): Density {
	return useContext(PreferencesContext)?.density ?? DEFAULT_DENSITY;
}
