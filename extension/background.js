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
			(suffix) =>
				url.hostname === suffix.slice(1) || url.hostname.endsWith(suffix),
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
		return {
			ok: false,
			code: "BAD_REQUEST",
			message: "Swagger URL is required.",
		};
	}
	if (!isAllowedApiUrl(rawUrl)) {
		return {
			ok: false,
			code: "URL_NOT_ALLOWED",
			message: "URL host is not on the extension allowlist.",
		};
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
		return {
			ok: false,
			code: "BAD_REQUEST",
			message: "Invalid URL format.",
		};
	}

	const headers = { Accept: "application/json,text/plain,*/*" };
	if (effectiveUser || effectivePass) {
		headers.Authorization = "Basic " + btoa(`${effectiveUser}:${effectivePass}`);
	}

	let response;
	try {
		response = await fetch(cleanUrl, {
			method: "GET",
			credentials: "include",
			headers,
			// "manual" (not "follow"): an unauthenticated gateway answers with a 3xx
			// to an SSO/login page on another host that is not in host_permissions.
			// Following it cross-origin throws "TypeError: Failed to fetch"; instead
			// we surface the redirect as an opaqueredirect and classify it below.
			redirect: "manual",
		});
	} catch (error) {
		return { ok: false, code: "NETWORK_ERROR", message: String(error) };
	}

	// A redirect (opaque, since redirect:"manual") means we were bounced to a
	// login page rather than served the spec — treat it as not authenticated.
	if (
		response.type === "opaqueredirect" ||
		(response.status >= 300 && response.status < 400)
	) {
		return {
			ok: false,
			code: "NOT_AUTHENTICATED",
			message:
				"Request was redirected, likely to a login page. Log in via \"Open in browser\" and retry.",
		};
	}

	const text = await response.text();

	if (!response.ok) {
		const code =
			response.status === 401 || response.status === 403
				? "NOT_AUTHENTICATED"
				: "UPSTREAM_ERROR";
		return {
			ok: false,
			code,
			status: response.status,
			message: `Upstream returned ${response.status} ${response.statusText}.`,
		};
	}

	try {
		JSON.parse(text);
	} catch {
		return {
			ok: false,
			code: "NOT_AUTHENTICATED",
			message:
				"Response was not JSON — likely a login page. Log in to the API domain and retry.",
		};
	}

	return { ok: true, data: text };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	const senderOrigin =
		sender.origin ?? (sender.url ? new URL(sender.url).origin : "");
	if (
		sender.id !== chrome.runtime.id ||
		!ALLOWED_PAGE_ORIGINS.includes(senderOrigin)
	) {
		sendResponse({
			ok: false,
			code: "FORBIDDEN_SENDER",
			message: "Sender not allowed.",
		});
		return false;
	}

	if (message?.action === "ping") {
		sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
		return false;
	}

	if (message?.action === "fetchSwagger") {
		handleFetchSwagger(message.payload).then(sendResponse);
		return true;
	}

	if (message?.action === "openLogin") {
		const url = message.payload?.url;
		if (typeof url === "string" && isAllowedApiUrl(url)) {
			chrome.tabs.create({ url });
			sendResponse({ ok: true });
		} else {
			sendResponse({
				ok: false,
				code: "URL_NOT_ALLOWED",
				message: "URL host is not on the extension allowlist.",
			});
		}
		return false;
	}

	sendResponse({
		ok: false,
		code: "UNKNOWN_ACTION",
		message: `Unknown action: ${message?.action}`,
	});
	return false;
});
