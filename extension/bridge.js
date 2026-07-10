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
						? {
								ok: false,
								code: "BRIDGE_ERROR",
								message: lastError.message ?? "Extension bridge error.",
							}
						: response,
				},
				window.location.origin,
			);
		},
	);
});
