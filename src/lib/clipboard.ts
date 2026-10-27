/**
 * Copy text to the clipboard. Falls back to a hidden textarea + `execCommand`
 * where the async Clipboard API is unavailable (insecure origins, old
 * browsers). Rejects when neither path works.
 */
export async function copyText(text: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return;
	}

	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	document.body.appendChild(textarea);
	textarea.select();
	try {
		if (!document.execCommand("copy")) throw new Error("Copy command was rejected");
	} finally {
		document.body.removeChild(textarea);
	}
}
