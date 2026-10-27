import { fetchSwaggerViaExtension } from "./swaggerExtensionBridge";
import { fetchSwaggerFromUrl } from "./swaggerMinifier";
import { needsSessionPassword, type SwaggerProfile } from "./swaggerProfilesStorage";

export type SwaggerFetchResult = { ok: true; rawJson: string } | { ok: false; error: string };

/**
 * Fetches a profile's spec, through the browser extension when it is connected
 * (so auth-gated docs use the browser session) and the server proxy otherwise.
 * Extension failures that the proxy may still get past fall back to it.
 */
export async function fetchSwaggerForProfile(
	profile: Pick<SwaggerProfile, "url" | "username" | "password" | "askPassword">,
	useExtension: boolean,
): Promise<SwaggerFetchResult> {
	if (!profile.url.trim()) {
		return { ok: false, error: "Select a profile with a Swagger URL first." };
	}
	// The extension can still get in with the browser session; the server route can't.
	if (!useExtension && needsSessionPassword(profile)) {
		return {
			ok: false,
			error:
				"This profile doesn't store its password. Enter it for this session in the Minifier's URL form, then retry.",
		};
	}

	try {
		if (useExtension) {
			const result = await fetchSwaggerViaExtension(
				profile.url,
				profile.username,
				profile.password,
			);
			if (result.ok) {
				return { ok: true, rawJson: JSON.stringify(JSON.parse(result.data), null, 2) };
			}
			if (result.code === "NOT_AUTHENTICATED") {
				return {
					ok: false,
					error: 'Not logged in to the API domain. Use "Open in browser" to log in, then retry.',
				};
			}
			if (
				result.code !== "URL_NOT_ALLOWED" &&
				result.code !== "BRIDGE_ERROR" &&
				result.code !== "TIMEOUT"
			) {
				console.error("Error fetching swagger via extension:", result);
				return { ok: false, error: result.message };
			}
		}

		const rawJson = await fetchSwaggerFromUrl(profile.url, profile.username, profile.password);
		return { ok: true, rawJson };
	} catch (error) {
		console.error("Error fetching swagger from URL:", error);
		return {
			ok: false,
			error: error instanceof Error ? error.message : "Failed to fetch swagger from URL.",
		};
	}
}
