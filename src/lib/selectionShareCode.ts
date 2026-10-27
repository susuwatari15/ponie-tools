/**
 * Packs a list of endpoint ids into a short URL-safe string: ids joined by
 * newlines, deflated with the native `CompressionStream` when available, then
 * base64url-encoded. The first character records the encoding (`z` deflated,
 * `r` raw) so links from either path decode anywhere that supports it.
 */

const SEPARATOR = "\n";

function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
	const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
	const response = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
	return new Uint8Array(await response.arrayBuffer());
}

export async function encodeSelection(ids: string[]): Promise<string> {
	const bytes = new TextEncoder().encode(ids.join(SEPARATOR));
	if (typeof CompressionStream === "undefined") return `r${toBase64Url(bytes)}`;
	return `z${toBase64Url(await pipe(bytes, new CompressionStream("deflate-raw")))}`;
}

/** Returns `null` for a malformed or unsupported code. */
export async function decodeSelection(code: string): Promise<string[] | null> {
	try {
		const kind = code[0];
		let bytes = fromBase64Url(code.slice(1));
		if (kind === "z") {
			if (typeof DecompressionStream === "undefined") return null;
			bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
		} else if (kind !== "r") {
			return null;
		}
		const text = new TextDecoder().decode(bytes);
		return text ? text.split(SEPARATOR) : [];
	} catch {
		return null;
	}
}
