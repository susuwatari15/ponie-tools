# Step 4 — Installation, Test Matrix, Acceptance Criteria

## 1. Install (local, unpacked)

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** → select the repo's `extension/` folder.
4. The extension appears as "Ponie Swagger Fetcher". Chrome shows a "developer mode extensions" notice on startup — expected, dismissible.

Updating after code changes: click the ↻ reload icon on the extension card, then reload the Ponie Tools tab (content scripts don't hot-reload).

No Web Store publishing, no signing, no pinned `key` needed (the content-script bridge makes the extension ID irrelevant).

## 2. Test matrix

Prereq: a profile in Ponie Tools pointing at `https://e2e-api-dev.masangrouptech.com/production-swagger/doc.json` with the Basic auth credentials.

| # | Setup | Action | Expected |
|---|---|---|---|
| 1 | Extension installed, logged in to API domain in same Chrome profile | Load from URL | Spec JSON loads; endpoint list renders; badge shows "extension: connected" |
| 2 | Extension installed, logged OUT (clear cookies for the API domain) | Load from URL | Error: "Not logged in… Open in browser… retry"; no crash |
| 3 | Continue #2: click "Open in browser", log in, return, retry | Load from URL | Succeeds |
| 4 | Extension NOT installed (or disabled) | Load from URL | Falls back to `/api/fetch-swagger`; behavior identical to before this change |
| 5 | Extension installed, profile URL on a non-allowlisted host that the server route CAN reach (any public swagger JSON, e.g. `https://petstore3.swagger.io/api/v3/openapi.json`) | Load from URL | `URL_NOT_ALLOWED` → silent fallback to server route → loads |
| 6 | Extension installed mid-session (page already open) | Install, refocus tab, Load from URL | Focus re-probe flips to extension path without page reload |
| 7 | Large spec (multi-MB doc.json) | Load from URL | Completes; no message-size errors (Chrome's limit is far above typical spec sizes) |
| 8 | `pnpm dev` on `http://localhost:3000` | Repeat #1 | Works (localhost is in `content_scripts.matches` and `ALLOWED_PAGE_ORIGINS`) |
| 9 | Hostile page check: any non-Ponie site | Run in DevTools: `window.postMessage({type:"PONIE_EXT_REQUEST",requestId:"x",action:"fetchSwagger",payload:{url:"https://e2e-api-dev.masangrouptech.com/production-swagger/doc.json"}}, "*")` | Nothing happens (no content script on that origin) |

## 3. Acceptance criteria

- All 9 matrix rows pass.
- `pnpm lint` and `pnpm build` pass with no new warnings from the touched files.
- `/api/fetch-swagger` route is byte-identical to before (fallback preserved).
- Grepping `extension/` shows no `console.log` of auth headers, cookies, or full response bodies.
- No SSR breakage: hard-reload the swagger-minifier page with JS disabled-then-enabled and confirm no hydration errors in the console.

## 4. Troubleshooting for the executing agent

| Symptom | Likely cause | Fix |
|---|---|---|
| Page always falls back to server route | Content script not injected (URL not matching `matches`), or page loaded before extension installed | Check origin matches exactly; reload tab after (re)loading extension |
| `BRIDGE_ERROR: The message port closed before a response was received` | Listener didn't `return true` on the async `fetchSwagger` branch | Ensure `return true` in `background.js` |
| Fetch returns login HTML even though user is logged in | Cookie is `SameSite` and not attached — verify `credentials: "include"` is set and the request runs in the **service worker**, not the content script | Move/keep fetch in `background.js` |
| Fetch throws `TypeError: Request cannot be constructed from a URL that includes credentials` | Profile URL has embedded `user:pass@` | Ensure `normalizeUrl()` strips credentials before fetch |
| Works on vercel.app but not localhost | Origin missing from `ALLOWED_PAGE_ORIGINS` in `background.js` or from `manifest.json` matches | Keep the two lists in sync |
| Service worker "inactive" in chrome://extensions | Normal MV3 idle behavior | No action; messages wake it |

## 5. Known limitations (document in the repo, don't fix now)

- Chrome-only (Edge works with the same files via `edge://extensions`; Firefox would need an MV3 port with `browser.*` polyfill).
- Each machine installs the extension manually; updates are manual re-pulls + reload.
- If the user's gateway session expires mid-work, the first failed fetch surfaces the log-in-and-retry flow — by design, the extension never handles credentials for the cookie login itself.
