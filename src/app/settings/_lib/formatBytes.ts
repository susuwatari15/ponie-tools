/** Approximate size for storage figures (decimal units, like the browser reports). */
export function formatBytes(bytes: number): string {
	if (bytes < 1_000) return `${bytes} B`;
	if (bytes < 1_000_000) return `${Math.round(bytes / 1_000)} KB`;
	if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
	return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
}
