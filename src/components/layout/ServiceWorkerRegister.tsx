"use client";

import { type FC, useEffect } from "react";

/**
 * Registers `public/sw.js` (offline app shell) in production builds only — in
 * dev a cache-first worker would serve stale chunks across HMR reloads.
 * Registration waits for `load` so it never competes with first paint.
 */
export const ServiceWorkerRegister: FC = () => {
	useEffect(() => {
		if (process.env.NODE_ENV !== "production") return;
		if (!("serviceWorker" in navigator)) return;

		const register = () => {
			navigator.serviceWorker
				.register("/sw.js", { scope: "/", updateViaCache: "none" })
				.catch((error: unknown) => {
					console.warn("Service worker registration failed", error);
				});
		};

		if (document.readyState === "complete") {
			register();
			return;
		}
		window.addEventListener("load", register, { once: true });
		return () => window.removeEventListener("load", register);
	}, []);

	return null;
};
