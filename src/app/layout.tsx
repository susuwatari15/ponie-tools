import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/ToastProvider";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
	display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Ponie — API developer tools",
	description:
		"A terminal-native suite for minifying, comparing, and diffing OpenAPI specs and permissions.",
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "any" },
			{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
			{ url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
		],
		apple: "/apple-touch-icon.png",
	},
	manifest: "/site.webmanifest",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="en"
			className={`${inter.variable} ${jetbrainsMono.variable}`}
			suppressHydrationWarning
		>
			<head>
				{/* Sets the theme class before first paint to avoid a light-mode flash.
				    External file (not inline) so React does not warn about
				    non-executing inline scripts on the client. */}
				<script src="/theme-init.js" />
			</head>
			<body>
				<ThemeProvider>
					<ToastProvider>
						<AppShell>{children}</AppShell>
					</ToastProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
