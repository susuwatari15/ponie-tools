# Step 1 — Build the Chrome Extension (`extension/`)

Manifest V3, no build step, three files. Read `03-protocol.md` first for the message contract.

## 1.1 `extension/manifest.json`

```json
{
	"manifest_version": 3,
	"name": "Ponie Swagger Fetcher",
	"version": "1.0.0",
	"description": "Fetches authenticated Swagger docs for Ponie Tools using your existing browser session.",
	"background": { "service_worker": "background.js" },
	"content_scripts": [
		{
			"matches": [
				"https://ponie-tools.vercel.app/*",
				"http://localhost:3000/*"
			],
			"js": ["bridge.js"],
			"run_at": "document_start"
		}
	],
	"host_permissions": ["https://*.masangrouptech.com/*"],
	"permissions": []
}
```

Notes:

- `http://localhost:3000/*` is included so the extension also works against `pnpm dev`.
- No `permissions` entries are needed: `chrome.tabs.create` (used for the login flow) works without the `tabs` permission, and cookie access is implicit in credentialed fetches under `host_permissions`.
- If more API domains are needed later, add them to `host_permissions` AND to `ALLOWED_API_HOST_SUFFIXES` in `background.js`.

## 1.2 `extension/bridge.js` (content script)

Pure relay between the page and the service worker. It must not fetch, must not touch cookies, and must ignore messages from iframes/other sources.

```js
// Relays PONIE_EXT_REQUEST messages from the Ponie Tools page to the
// background service worker, and posts PONIE_EXT_RESPONSE back.
const REQUEST_TYPE = "PONIE_EXT_REQUEST";
const RESPONSE_TYPE = "PONIE_EXT_RESPONSE";

window.addEventListener("message", (event) => {
	// Only accept messages from this exact window/origin (not iframes).
	if (event.source !== window) return;
	if (event.origin !== window.location.origin) return;

	const data = event.data;
	if (!data || data.type !== REQUEST_TYPE) return;
	if (typeof data.requestId !== "string" || typeof data.action !== "string") return;

	chrome.runtime.sendMessage(
		{ action: data.action, payload: data.payload ?? {} },
		(response) => {
			const lastError = chrome.runtime.lastError;
			window.postMessage(
				{
					type: RESPONSE_TYPE,
					requestId: data.requestId,
					response: lastError
						? { ok: false, code: "BRIDGE_ERROR", message: lastError.message ?? "Extension bridge error." }
						: response,
				},
				window.location.origin,
			);
		},
	);
});
```

## 1.3 `extension/background.js` (service worker)

Responsibilities: validate sender, validate target URL, perform the credentialed fetch, classify failures (especially "you got a login page instead of JSON"), open a login tab on request.

```js
const ALLOWED_API_HOST_SUFFIXES = [".masangrouptech.com"];
const ALLOWED_PAGE_ORIGINS = [
	"https://ponie-tools.vercel.app",
	"http://localhost:3000",
];

function isAllowedApiUrl(rawUrl) {
	try {
		const url = new URL(rawUrl);
		if (url.protocol !== "https:") return false;
		return ALLOWED_API_HOST_SUFFIXES.some(
			(suffix) => url.hostname === suffix.slice(1) || url.hostname.endsWith(suffix),
		);
	} catch {
		return false;
	}
}

// fetch() throws on URLs with embedded credentials (https://user:pass@host/...).
// Profiles may store such URLs, so strip credentials and return them separately.
function normalizeUrl(rawUrl) {
	const url = new URL(rawUrl);
	const embedded = {
		username: decodeURIComponent(url.username ?? ""),
		password: decodeURIComponent(url.password ?? ""),
	};
	url.username = "";
	url.password = "";
	return { cleanUrl: url.toString(), embedded };
}

async function handleFetchSwagger(payload) {
	const { url: rawUrl, username, password } = payload ?? {};
	if (typeof rawUrl !== "string" || !rawUrl.trim()) {
		return { ok: false, code: "BAD_REQUEST", message: "Swagger URL is required." };
	}
	if (!isAllowedApiUrl(rawUrl)) {
		return { ok: false, code: "URL_NOT_ALLOWED", message: "URL host is not on the extension allowlist." };
	}

	let cleanUrl;
	let effectiveUser = username ?? "";
	let effectivePass = password ?? "";
	try {
		const normalized = normalizeUrl(rawUrl);
		cleanUrl = normalized.cleanUrl;
		if (!effectiveUser && !effectivePass) {
			effectiveUser = normalized.embedded.username;
			effectivePass = normalized.embedded.password;
		}
	} catch {
		return { ok: false, code: "BAD_REQUEST", message: "Invalid URL format." };
	}

	const headers = { Accept: "application/json,text/plain,*/*" };
	if (effectiveUser || effectivePass) {
		headers.Authorization = "Basic " + btoa(`${effectiveUser}:${effectivePass}`);
	}

	let response;
	try {
		response = await fetch(cleanUrl, {
			method: "GET",
			credentials: "include", // attach session cookies for the target host
			headers,
			// "manual", not "follow": an unauthenticated gateway 3xx-redirects to an
			// SSO/login page on a host outside host_permissions. Following it throws
			// "TypeError: Failed to fetch"; instead we classify the redirect below.
			redirect: "manual",
		});
	} catch (error) {
		return { ok: false, code: "NETWORK_ERROR", message: String(error) };
	}

	// A redirect (opaque, since redirect:"manual") ⇒ bounced to a login page.
	if (
		response.type === "opaqueredirect" ||
		(response.status >= 300 && response.status < 400)
	) {
		return {
			ok: false,
			code: "NOT_AUTHENTICATED",
			message: "Request was redirected, likely to a login page. Log in via \"Open in browser\" and retry.",
		};
	}

	const text = await response.text();

	if (!response.ok) {
		const code =
			response.status === 401 || response.status === 403
				? "NOT_AUTHENTICATED"
				: "UPSTREAM_ERROR";
		return { ok: false, code, status: response.status, message: `Upstream returned ${response.status} ${response.statusText}.` };
	}

	try {
		JSON.parse(text);
	} catch {
		// 200 with non-JSON body ⇒ almost certainly redirected to a login page.
		return {
			ok: false,
			code: "NOT_AUTHENTICATED",
			message: "Response was not JSON — likely a login page. Log in to the API domain and retry.",
		};
	}

	return { ok: true, data: text };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	const senderOrigin =
		sender.origin ?? (sender.url ? new URL(sender.url).origin : "");
	if (sender.id !== chrome.runtime.id || !ALLOWED_PAGE_ORIGINS.includes(senderOrigin)) {
		sendResponse({ ok: false, code: "FORBIDDEN_SENDER", message: "Sender not allowed." });
		return false;
	}

	if (message?.action === "ping") {
		sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
		return false;
	}

	if (message?.action === "fetchSwagger") {
		handleFetchSwagger(message.payload).then(sendResponse);
		return true; // keep the message channel open for the async response
	}

	if (message?.action === "openLogin") {
		const url = message.payload?.url;
		if (typeof url === "string" && isAllowedApiUrl(url)) {
			chrome.tabs.create({ url });
			sendResponse({ ok: true });
		} else {
			sendResponse({ ok: false, code: "URL_NOT_ALLOWED", message: "URL host is not on the extension allowlist." });
		}
		return false;
	}

	sendResponse({ ok: false, code: "UNKNOWN_ACTION", message: `Unknown action: ${message?.action}` });
	return false;
});
```

Implementation notes for the executing agent:

- `return true` from the listener is mandatory for the async `fetchSwagger` branch; without it Chrome closes the channel and the page gets `BRIDGE_ERROR`.
- The service worker sleeps when idle; incoming messages wake it. No keep-alive hacks needed.
- Do NOT log the Authorization header, cookies, or response bodies in production code paths.

## 1.4 Standalone smoke test (before web-app integration)

1. Load the extension unpacked (see `04-install-and-test.md` §1).
2. In `chrome://extensions` → the extension → "Inspect views: service worker", run:
   ```js
   fetch("https://e2e-api-dev.masangrouptech.com/production-swagger/doc.json", { credentials: "include" })
     .then((r) => r.text()).then((t) => console.log(t.slice(0, 200)));
   ```
3. While logged in to the domain in the same Chrome profile: output starts with `{` (JSON). While logged out: output is HTML or an error — confirms the NOT_AUTHENTICATED classification path.
