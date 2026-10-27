// Ponie Tools service worker — hand-written, no build step.
//
// All tool processing is client-side, so once the app shell and its static
// assets are cached the tools keep working offline. Only `/api/*` (e.g.
// `/api/fetch-swagger`) and the browser extension need the network.
//
// Strategies:
//   - navigations         network-first, falling back to the cached page, then `/`
//   - /_next/static/*     cache-first (content-hashed, immutable)
//   - Google Fonts        cache-first (next/font self-hosts, this is a fallback)
//   - other same-origin   stale-while-revalidate (icons, manifest, theme-init.js)
//   - /api/*, RSC payloads, non-GET, other cross-origin   never touched
//
// Bump VERSION to drop every cache from older versions on activate.

const VERSION = "v1";
const CACHE_PREFIX = "ponie-";
const SHELL_CACHE = `${CACHE_PREFIX}shell-${VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}static-${VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, STATIC_CACHE];

/** Keeps hashed chunks from piling up across deploys. */
const MAX_STATIC_ENTRIES = 300;
const MAX_SHELL_ENTRIES = 60;

// Keep in sync with src/components/layout/constants/nav-items.ts.
const SHELL_PAGES = [
	"/",
	"/minifier",
	"/swagger-compare",
	"/permission-diff",
	"/px-to-rem",
	"/epoch-converter",
	"/json-formatter",
];

const SHELL_ASSETS = [
	"/site.webmanifest",
	"/theme-init.js",
	"/favicon.ico",
	"/favicon-16x16.png",
	"/favicon-32x32.png",
	"/apple-touch-icon.png",
	"/android-chrome-192x192.png",
	"/android-chrome-512x512.png",
];

const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

const STATIC_ASSET_PATTERN = /\/_next\/static\/[^"'\s)\\]+/g;

const isCacheable = (response) =>
	Boolean(response) && response.ok && (response.type === "basic" || response.type === "cors");

async function trimCache(cacheName, maxEntries) {
	const cache = await caches.open(cacheName);
	const keys = await cache.keys();
	// `keys()` is in insertion order, so the oldest entries go first.
	for (const request of keys.slice(0, Math.max(0, keys.length - maxEntries))) {
		await cache.delete(request);
	}
}

async function put(cacheName, request, response, maxEntries) {
	const cache = await caches.open(cacheName);
	await cache.put(request, response);
	await trimCache(cacheName, maxEntries);
}

/**
 * Caches each shell page plus the `/_next/static/` assets its HTML references,
 * so a tool that was never opened online still boots offline. Failures are
 * ignored: a missing page must not abort the whole install.
 */
async function precacheShell() {
	const shell = await caches.open(SHELL_CACHE);
	const statics = await caches.open(STATIC_CACHE);
	const assetUrls = new Set();

	await Promise.all(
		SHELL_PAGES.map(async (path) => {
			try {
				const response = await fetch(path, { cache: "no-cache", credentials: "same-origin" });
				if (!isCacheable(response)) return;
				const html = await response.clone().text();
				for (const match of html.matchAll(STATIC_ASSET_PATTERN)) assetUrls.add(match[0]);
				await shell.put(path, response);
			} catch {
				// Offline or failing page: it is cached on its first online visit instead.
			}
		}),
	);

	await Promise.all(
		[...SHELL_ASSETS, ...assetUrls].map(async (url) => {
			try {
				const target = url.startsWith("/_next/static/") ? statics : shell;
				if (await target.match(url)) return;
				const response = await fetch(url, { credentials: "same-origin" });
				if (isCacheable(response)) await target.put(url, response);
			} catch {
				// Ignore: cached lazily on first use.
			}
		}),
	);
}

self.addEventListener("install", (event) => {
	event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const names = await caches.keys();
			await Promise.all(
				names
					.filter((name) => name.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.includes(name))
					.map((name) => caches.delete(name)),
			);
			if (self.registration.navigationPreload) {
				await self.registration.navigationPreload.enable();
			}
			await self.clients.claim();
		})(),
	);
});

async function networkFirstNavigation(event) {
	const { request } = event;
	// Pages are keyed by path alone: query strings (share links, filters) are
	// read client-side, and keying by them would let variants evict the shell.
	const key = new URL(request.url).pathname;
	try {
		const response = (await event.preloadResponse) || (await fetch(request));
		if (isCacheable(response) && !response.redirected) {
			event.waitUntil(put(SHELL_CACHE, key, response.clone(), MAX_SHELL_ENTRIES));
		}
		return response;
	} catch (error) {
		const cache = await caches.open(SHELL_CACHE);
		const cached = (await cache.match(key)) || (await cache.match("/"));
		if (cached) return cached;
		throw error;
	}
}

async function cacheFirst(event, cacheName, maxEntries) {
	const { request } = event;
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);
	if (cached) return cached;

	const response = await fetch(request);
	if (isCacheable(response)) {
		event.waitUntil(put(cacheName, request, response.clone(), maxEntries));
	}
	return response;
}

async function staleWhileRevalidate(event) {
	const { request } = event;
	const cache = await caches.open(SHELL_CACHE);
	const cached = await cache.match(request);
	const network = fetch(request)
		.then((response) => {
			if (isCacheable(response)) {
				return put(SHELL_CACHE, request, response.clone(), MAX_SHELL_ENTRIES).then(() => response);
			}
			return response;
		})
		.catch(() => undefined);

	if (cached) {
		event.waitUntil(network);
		return cached;
	}
	const response = await network;
	return response || Response.error();
}

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;

	const url = new URL(request.url);

	if (url.origin !== self.location.origin) {
		if (FONT_HOSTS.includes(url.hostname)) {
			event.respondWith(cacheFirst(event, STATIC_CACHE, MAX_STATIC_ENTRIES));
		}
		return;
	}

	if (url.pathname.startsWith("/api/")) return;
	if (url.pathname === "/sw.js") return;

	// App Router flight data varies by request headers; let the router fall back
	// to a full navigation (handled below) when it can't be fetched.
	if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;

	if (request.mode === "navigate") {
		event.respondWith(networkFirstNavigation(event));
		return;
	}

	if (url.pathname.startsWith("/_next/static/")) {
		event.respondWith(cacheFirst(event, STATIC_CACHE, MAX_STATIC_ENTRIES));
		return;
	}

	// Dev/HMR and image-optimizer endpoints are never cached.
	if (url.pathname.startsWith("/_next/")) return;

	event.respondWith(staleWhileRevalidate(event));
});
