import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { PreferencesProvider } from "@/components/layout/PreferencesProvider";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
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
	title: "Ponie — developer toolkit",
	description:
		"A terminal-native toolkit: minify and diff OpenAPI specs, compare permission sets across role groups, and format JSON, convert epoch timestamps and px ↔ rem — all in the browser.",
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

// Browser/PWA chrome colour: the `--ink` page background of each theme (globals.css).
export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#F4F6FA" },
		{ media: "(prefers-color-scheme: dark)", color: "#0B0E14" },
	],
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
					<PreferencesProvider>
						<ToastProvider>
							<AppShell>{children}</AppShell>
						</ToastProvider>
					</PreferencesProvider>
				</ThemeProvider>
				<ServiceWorkerRegister />
			</body>
		</html>
	);
}
