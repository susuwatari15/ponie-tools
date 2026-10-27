/** Cheap, stable, non-cryptographic hash (32-bit FNV-1a) rendered in base 36. */
export function hashString(input: string): string {
	let hash = 0x811c9dc5;
	for (let i = 0; i < input.length; i += 1) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(36);
}
