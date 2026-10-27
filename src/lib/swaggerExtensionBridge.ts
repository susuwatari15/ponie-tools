const REQUEST_TYPE = "PONIE_EXT_REQUEST";
const RESPONSE_TYPE = "PONIE_EXT_RESPONSE";

export type ExtensionFetchResult =
	| { ok: true; data: string }
	| { ok: false; code: string; message: string; status?: number };

type BridgeResponseEvent = {
	type: string;
	requestId: string;
	response: ExtensionFetchResult | { ok: true; version: string; hosts?: string[] };
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
			resolve(null);
		}, timeoutMs);

		const onMessage = (event: MessageEvent) => {
			if (event.source !== window) return;
			const data = event.data as BridgeResponseEvent | undefined;
			if (
				!data ||
				data.type !== RESPONSE_TYPE ||
				data.requestId !== requestId
			) {
				return;
			}
			cleanup();
			resolve(data.response as T);
		};

		window.addEventListener("message", onMessage);
		window.postMessage(
			{ type: REQUEST_TYPE, requestId, action, payload },
			window.location.origin,
		);
	});
}

/** True when the extension bridge answers a ping within the timeout. */
export async function isExtensionAvailable(timeoutMs = 500): Promise<boolean> {
	const response = await sendToExtension<{ ok: boolean }>("ping", {}, timeoutMs);
	return response?.ok === true;
}

export type ExtensionInfo = {
	version: string;
	/**
	 * `host_permissions` match patterns from the extension's manifest, or null
	 * when an older build doesn't report them.
	 */
	hosts: string[] | null;
};

/** Pings the extension and returns what it reports, or null when it doesn't answer. */
export async function getExtensionInfo(timeoutMs = 500): Promise<ExtensionInfo | null> {
	const response = await sendToExtension<{ ok: boolean; version?: unknown; hosts?: unknown }>(
		"ping",
		{},
		timeoutMs,
	);
	if (response?.ok !== true) return null;
	const hosts = Array.isArray(response.hosts)
		? response.hosts.filter((host): host is string => typeof host === "string")
		: null;
	return {
		version: typeof response.version === "string" ? response.version : "unknown",
		hosts,
	};
}

/**
 * Whether `url` falls under a manifest match pattern such as
 * `https://*.example.com/*` (scheme + host only; the path part is ignored).
 */
export function matchesHostPattern(url: string, pattern: string): boolean {
	const match = /^(\*|https?):\/\/([^/]+)\//.exec(pattern);
	if (!match) return pattern === "<all_urls>";
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return false;
	}
	const [, scheme, host] = match;
	const protocol = parsed.protocol.slice(0, -1);
	if (scheme === "*" ? protocol !== "http" && protocol !== "https" : protocol !== scheme) {
		return false;
	}
	if (host === "*") return true;
	if (host.startsWith("*.")) {
		const base = host.slice(2);
		return parsed.hostname === base || parsed.hostname.endsWith(`.${base}`);
	}
	return parsed.hostname === host;
}

/**
 * Whether a fetch of `url` would go through the extension. With unknown hosts
 * (older extension build) it is assumed to; a `URL_NOT_ALLOWED` answer still
 * falls back to the server route (see `fetchSwaggerForProfile`).
 */
export function isUrlCoveredByExtension(url: string, hosts: string[] | null): boolean {
	if (!hosts) return true;
	return hosts.some((pattern) => matchesHostPattern(url, pattern));
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
		return {
			ok: false,
			code: "TIMEOUT",
			message: "Extension did not respond.",
		};
	}
	return response;
}

/** Ask the extension to open the API URL in a new tab so the user can log in. */
export async function openLoginViaExtension(url: string): Promise<void> {
	await sendToExtension("openLogin", { url }, 2_000);
}
