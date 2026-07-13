# Message Protocol Reference

Shared contract between the web page (`src/lib/swaggerExtensionBridge.ts`), the content script (`extension/bridge.js`), and the service worker (`extension/background.js`). Keep the three in sync; this file is the source of truth.

## Transport

1. **Page → content script**: `window.postMessage(request, window.location.origin)`
2. **Content script → service worker**: `chrome.runtime.sendMessage({ action, payload })`
3. **Service worker → content script**: `sendResponse(response)` (async branches must `return true` from the listener)
4. **Content script → page**: `window.postMessage({ type: "PONIE_EXT_RESPONSE", requestId, response }, window.location.origin)`

## Envelope

Request (page → extension):

```ts
{
	type: "PONIE_EXT_REQUEST",
	requestId: string,   // crypto.randomUUID(), echoed back verbatim
	action: "ping" | "fetchSwagger" | "openLogin",
	payload: object,     // action-specific, see below
}
```

Response (extension → page):

```ts
{
	type: "PONIE_EXT_RESPONSE",
	requestId: string,   // matches the request
	response: SuccessShape | ErrorShape,
}
```

## Actions

### `ping`

Payload: `{}`. Success: `{ ok: true, version: string }`. Used for presence detection; page treats no response within ~500 ms as "extension absent".

### `fetchSwagger`

Payload:

```ts
{ url: string, username?: string, password?: string }
```

- `url` must be `https://` and host must match the extension allowlist (`*.masangrouptech.com`).
- Before fetching, the background worker verifies that Chrome has actually granted the matching host permission. If the user withheld it through the extension's **Site access** controls, Chrome prompts to restore the declared permission; declining or an unavailable prompt returns `HOST_PERMISSION_REQUIRED` without issuing a CORS-blocked request.
- URLs with embedded credentials (`https://user:pass@host/…`) are accepted; the extension strips them and uses them as Basic auth when `username`/`password` aren't provided.
- Fetch is `GET`, `credentials: "include"`, `redirect: "manual"`, plus `Authorization: Basic …` when credentials exist. A redirect (opaque, from `redirect: "manual"`) is classified as `NOT_AUTHENTICATED` — an unauthenticated gateway bounces to an SSO/login page on a host outside `host_permissions`, and following it would throw `TypeError: Failed to fetch`.

Success: `{ ok: true, data: string }` — `data` is the raw JSON **text** (already validated as parseable JSON). The page pretty-prints it.

### `openLogin`

Payload: `{ url: string }` (same allowlist rules). Opens the URL in a new tab so the user can complete the gateway login. Success: `{ ok: true }`.

## Error shape and codes

```ts
{ ok: false, code: string, message: string, status?: number }
```

| Code | Emitted by | Meaning | Page behavior |
|---|---|---|---|
| `BAD_REQUEST` | background | Missing/invalid URL | Show message |
| `URL_NOT_ALLOWED` | background | Host not on allowlist | Fall back to server route |
| `HOST_PERMISSION_REQUIRED` | background | The declared API host permission is currently withheld in Chrome | Tell user to allow the API host in the extension's Site access settings, then retry |
| `NOT_AUTHENTICATED` | background | 401/403, a 3xx redirect to a login page, or HTTP 200 with a non-JSON body | Tell user to log in via "Open in browser", retry |
| `UPSTREAM_ERROR` | background | Other non-2xx status (`status` field set) | Show message |
| `NETWORK_ERROR` | background | fetch threw (DNS, TLS, offline) | Show message |
| `FORBIDDEN_SENDER` | background | Message relayed from a non-allowlisted origin | Should never surface in the app |
| `UNKNOWN_ACTION` | background | Unrecognized `action` | Should never surface; indicates version skew |
| `BRIDGE_ERROR` | content script | `chrome.runtime.lastError` (worker unreachable) | Fall back to server route |
| `TIMEOUT` | page lib | No response within timeout | Fall back to server route |

## Security invariants (do not weaken)

1. Content script relays only for `event.source === window` and `event.origin === location.origin`; it never fetches and never reads cookies.
2. Background validates `sender.id === chrome.runtime.id` and sender origin ∈ `{https://ponie-tools.vercel.app, http://localhost:3000}`.
3. Background fetches only `https://` URLs on allowlisted hosts.
4. Only the response **body** crosses back to the page — never headers, cookies, or credentials.
5. `postMessage` always uses an explicit target origin, never `"*"`.

## Versioning

If the protocol changes incompatibly, rename the message types (e.g. `PONIE_EXT_REQUEST_V2`) so old extension installs fail presence detection instead of misbehaving.
