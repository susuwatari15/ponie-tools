# Step 2 — Web App Integration (ponie-tools)

Goal: when the extension is present, `Load from URL` fetches through it (browser session cookies, no CORS); otherwise the existing `/api/fetch-swagger` server route is used unchanged.

Files: one new lib, two modified files. Follow existing style: tabs, double quotes, named exports.

## 2.1 New file: `src/lib/swaggerExtensionBridge.ts`

Client-side counterpart of `extension/bridge.js`. All functions are browser-only (guard `typeof window === "undefined"`).

```ts
const REQUEST_TYPE = "PONIE_EXT_REQUEST";
const RESPONSE_TYPE = "PONIE_EXT_RESPONSE";

export type ExtensionFetchResult =
	| { ok: true; data: string }
	| { ok: false; code: string; message: string; status?: number };

type BridgeResponseEvent = {
	type: string;
	requestId: string;
	response: ExtensionFetchResult | { ok: true; version: string };
};

function sendToExtension<T>(
	action: string,
	payload: Record<string, unknown>,
	timeoutMs: number,
): Promise<T | null> {
	if (typeof window === "undefined") return Promise.resolve(null);

	return new Promise((resolve) => {
		const requestId = crypto.randomUUID();

		const cleanup = () => {
			window.removeEventListener("message", onMessage);
			window.clearTimeout(timer);
		};

		const timer = window.setTimeout(() => {
			cleanup();
			resolve(null); // extension absent or unresponsive
		}, timeoutMs);

		const onMessage = (event: MessageEvent) => {
			if (event.source !== window) return;
			const data = event.data as BridgeResponseEvent | undefined;
			if (!data || data.type !== RESPONSE_TYPE || data.requestId !== requestId) return;
			cleanup();
			resolve(data.response as T);
		};

		window.addEventListener("message", onMessage);
		window.postMessage({ type: REQUEST_TYPE, requestId, action, payload }, window.location.origin);
	});
}

/** True when the extension bridge answers a ping within the timeout. */
export async function isExtensionAvailable(timeoutMs = 500): Promise<boolean> {
	const response = await sendToExtension<{ ok: boolean }>("ping", {}, timeoutMs);
	return response?.ok === true;
}

/** Fetch swagger JSON through the extension. 60s timeout for large specs. */
export async function fetchSwaggerViaExtension(
	url: string,
	username?: string,
	password?: string,
): Promise<ExtensionFetchResult> {
	const response = await sendToExtension<ExtensionFetchResult>(
		"fetchSwagger",
		{ url, username, password },
		60_000,
	);
	if (response === null) {
		return { ok: false, code: "TIMEOUT", message: "Extension did not respond." };
	}
	return response;
}

/** Ask the extension to open the API URL in a new tab so the user can log in. */
export async function openLoginViaExtension(url: string): Promise<void> {
	await sendToExtension("openLogin", { url }, 2_000);
}
```

## 2.2 Modify: `src/app/_swagger-minifier/hooks/useSwaggerMinifier.ts`

### a) Track extension availability

Add state + a mount-time probe (re-probe on window focus so installing the extension mid-session is picked up):

```ts
const [extensionAvailable, setExtensionAvailable] = useState(false);

useEffect(() => {
	let cancelled = false;
	const probe = async () => {
		const available = await isExtensionAvailable();
		if (!cancelled) setExtensionAvailable(available);
	};
	probe();
	window.addEventListener("focus", probe);
	return () => {
		cancelled = true;
		window.removeEventListener("focus", probe);
	};
}, []);
```

### b) Route `onFetchFromUrl` through the extension when available

Replace the body of the current `try` block (which calls `fetchSwaggerFromUrl`) with:

```ts
try {
	if (extensionAvailable) {
		const result = await fetchSwaggerViaExtension(
			selectedProfile.url,
			selectedProfile.username,
			selectedProfile.password,
		);
		if (result.ok) {
			setRawJson(JSON.stringify(JSON.parse(result.data), null, 2));
		} else if (result.code === "NOT_AUTHENTICATED") {
			setUrlFetchError(
				"Not logged in to the API domain. Use \"Open in browser\" to log in, then retry.",
			);
		} else if (result.code === "URL_NOT_ALLOWED" || result.code === "TIMEOUT") {
			// Extension can't handle this URL / died — fall back to the server route.
			const fetchedJson = await fetchSwaggerFromUrl(
				selectedProfile.url,
				selectedProfile.username,
				selectedProfile.password,
			);
			setRawJson(fetchedJson);
		} else {
			setUrlFetchError(result.message);
		}
	} else {
		const fetchedJson = await fetchSwaggerFromUrl(
			selectedProfile.url,
			selectedProfile.username,
			selectedProfile.password,
		);
		setRawJson(fetchedJson);
	}
} catch (error) {
	// keep the existing catch block unchanged
}
```

### c) Export `extensionAvailable` from the hook's return object

so the form can render a status badge. (`SwaggerMinifierController` picks it up automatically via `ReturnType`.)

## 2.3 Modify: `src/app/_swagger-minifier/components/SwaggerUrlFetchForm.tsx`

Small, additive changes only:

1. Add prop `extensionAvailable: boolean` and pass it from the parent (`SwaggerInputPanel.tsx` / wherever the form is rendered from the controller — trace the actual prop chain and thread it through).
2. Render a status hint near the profile row, matching existing muted-text styling:
   - When `true`: `Browser extension: connected — fetching uses your browser session.` (e.g. `text-[11px] text-emerald-600 dark:text-emerald-400`)
   - When `false`: render nothing (don't advertise a tool most users won't have).
3. No change to the "Open in browser" link — it already serves as the login entry point for the NOT_AUTHENTICATED flow. Optional enhancement (skip unless trivial): when the fetch error is the not-logged-in message, visually emphasize the "Open in browser" button.

## 2.4 Behavior summary after this step

| Scenario | Result |
|---|---|
| Extension installed, logged in to API domain | Fetch succeeds via extension (cookie + Basic auth) |
| Extension installed, NOT logged in | Clear error telling the user to log in via "Open in browser", then retry |
| Extension installed, URL outside allowlist | Silent fallback to `/api/fetch-swagger` (old behavior) |
| Extension not installed | Exactly today's behavior (server route) |
| SSR/prerender | No window access at module top level; all probes inside effects |
