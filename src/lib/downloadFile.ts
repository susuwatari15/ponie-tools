/** Saves `text` as a file through a temporary object URL. */
export function downloadTextFile(fileName: string, text: string, type = "text/plain"): void {
	downloadBlob(fileName, new Blob([text], { type: `${type};charset=utf-8` }));
}

/** Saves a blob as a file through a temporary object URL. */
export function downloadBlob(fileName: string, blob: Blob): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	// Revoke on the next tick: some browsers start the download asynchronously.
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** A filesystem-safe slug: `My API — v2` → `my-api-v2`. */
export function toFileSlug(text: string, fallback = "file"): string {
	const slug = text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	return slug || fallback;
}
