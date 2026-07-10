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
