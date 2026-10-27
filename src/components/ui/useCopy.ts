"use client";

import { useCallback } from "react";
import { copyText } from "@/lib/clipboard";
import { useToast } from "./ToastProvider";

/**
 * Clipboard copy that reports its outcome as a toast. `text` may be a promise
 * (e.g. a share link still being built); empty text is a no-op. The returned
 * function resolves to whether the copy succeeded.
 */
export function useCopy() {
	const { toast } = useToast();

	return useCallback(
		async (
			text: string | Promise<string>,
			successMessage = "Copied to clipboard",
		): Promise<boolean> => {
			try {
				const value = await text;
				if (!value) return false;
				await copyText(value);
				toast(successMessage, "success");
				return true;
			} catch {
				toast("Couldn't access the clipboard", "error");
				return false;
			}
		},
		[toast],
	);
}
