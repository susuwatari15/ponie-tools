/** Character / byte count shown as an approximate size — specs are overwhelmingly ASCII. */
export function formatSize(chars: number): string {
	if (chars < 1_000) return `${chars} B`;
	if (chars < 1_000_000) return `${Math.round(chars / 1_000)} KB`;
	if (chars < 1_000_000_000) return `${(chars / 1_000_000).toFixed(1)} MB`;
	return `${(chars / 1_000_000_000).toFixed(1)} GB`;
}
