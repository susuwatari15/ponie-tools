"use client";

import { Moon, Sun } from "lucide-react";
import type { FC } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { useTheme } from "./ThemeProvider";

export const ThemeToggle: FC = () => {
	const { resolvedTheme, toggleTheme } = useTheme();
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
