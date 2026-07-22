"use client";

import { Moon, Sun } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { useTheme } from "./ThemeProvider";

export const ThemeToggle: FC = () => {
	const { resolvedTheme, toggleTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Until mounted, the resolved theme isn't known (localStorage is
	// client-only), so render a theme-neutral placeholder to keep the server
	// and first client render identical.
	if (!mounted) {
		return (
			<IconButton label="Toggle theme">
				<span className="h-4 w-4" aria-hidden />
			</IconButton>
		);
	}

	const isDark = resolvedTheme === "dark";
	return (
		<IconButton
			label={isDark ? "Switch to light theme" : "Switch to dark theme"}
			onClick={toggleTheme}
		>
			{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
		</IconButton>
	);
};
