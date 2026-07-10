# Plan: Local Chrome Extension for Authenticated Swagger Fetching

## Problem

Ponie Tools (`https://ponie-tools.vercel.app`, this repo) fetches Swagger/OpenAPI JSON via the server route `src/app/api/fetch-swagger/route.ts` using Basic auth. The upstream endpoint (e.g. `https://e2e-api-dev.masangrouptech.com/production-swagger/doc.json`) now sits behind a gateway that **requires an auth cookie** and **does not allow CORS**, so:

- The Vercel server route can't authenticate (it has no cookie and can't complete the login flow).
- The browser can't fetch directly (CORS blocked, and cookies wouldn't be sent cross-site anyway).

## Solution

A **locally installed (unpacked) Chrome extension**. The user is already logged in to `*.masangrouptech.com` in Chrome, so the browser holds a valid session cookie. An extension with `host_permissions` for that domain can fetch the Swagger JSON **with the user's existing cookies and without CORS restrictions**, then hand the JSON to the Ponie Tools web page.

```
┌────────────────────────────┐          window.postMessage          ┌──────────────────┐
│ ponie-tools.vercel.app     │ ◄──────────────────────────────────► │ bridge.js        │
│ (React page)               │   PONIE_EXT_REQUEST / _RESPONSE      │ (content script) │
└────────────────────────────┘                                      └────────┬─────────┘
                                                                             │ chrome.runtime.sendMessage
                                                                    ┌────────▼─────────┐
                                                                    │ background.js    │
                                                                    │ (service worker) │
                                                                    └────────┬─────────┘
                                                                             │ fetch(url, credentials:"include")
                                                                             │ + Basic auth header, session cookies
                                                                    ┌────────▼──────────────────────┐
                                                                    │ e2e-api-dev.masangrouptech.com│
                                                                    └───────────────────────────────┘
```

## Key design decisions

1. **Content-script bridge instead of `externally_connectable`.** `externally_connectable` requires the web page to know the extension ID, and unpacked extensions get a **different ID on every machine** (unless a `key` is pinned in the manifest). A content script injected on the Ponie Tools origin relays messages via `window.postMessage`, so the page never needs the extension ID. This is the deciding reason; do not switch to `externally_connectable`.
2. **All fetching in the background service worker.** Fetches from the service worker with `host_permissions` bypass CORS and attach session cookies (including `SameSite` cookies) when `credentials: "include"` is set. Content scripts must NOT fetch — their requests are subject to the page's origin rules.
3. **Web app degrades gracefully.** The page pings the extension; if absent or the ping times out, it falls back to the existing `/api/fetch-swagger` server route. No behavior change for users without the extension.
4. **Cookies never reach the page.** The extension only returns the response body (JSON text). It never reads or forwards cookie values.
5. **Strict allowlists on both sides.** The content script only runs on Ponie Tools origins; the background worker only fetches `https://` URLs on `*.masangrouptech.com` and only accepts messages relayed from allowlisted page origins.

## Repository layout

Extension code lives in this repo under a new top-level `extension/` folder (excluded from the Next.js build — it is plain JS loaded unpacked, no build step):

```
extension/
  manifest.json
  background.js
  bridge.js
docs/plans/chrome-extension/   ← this plan
```

Web-app changes touch:

```
src/lib/swaggerExtensionBridge.ts        (new)
src/app/_swagger-minifier/hooks/useSwaggerMinifier.ts   (modify)
src/app/_swagger-minifier/components/SwaggerUrlFetchForm.tsx  (modify, small)
```

## Execution order

1. `01-extension.md` — build the extension (standalone, testable on its own via the service-worker console).
2. `02-webapp-integration.md` — wire the web app to the extension with server-route fallback.
3. `03-protocol.md` — message protocol reference (shared contract for steps 1–2; read it first).
4. `04-install-and-test.md` — install steps, test matrix, acceptance criteria, troubleshooting.

## Constraints for the executing agent

- Follow the existing code style: tab indentation in `src/` TypeScript files, double quotes, named exports, `type` imports.
- Do not modify or remove the existing `/api/fetch-swagger` route — it stays as the fallback.
- Do not add npm dependencies. Extension files are dependency-free vanilla JS (ES2020+); Chrome ≥ 116 may be assumed.
- Run `pnpm lint` (`eslint src/`) after web-app changes; `extension/` is outside the lint scope.
