"use client";

import { useCallback, useMemo, useState } from "react";
import { useToast } from "@/components/ui";
import { copyText } from "../_lib/copyToClipboard";
import { beautify, minify, parseJson, type JsonError } from "../_lib/format";

export type ViewMode = "beautify" | "tree" | "minify";

export type UseJsonFormatter = {
	/** Raw controlled input text. */
	input: string;
	setInput: (raw: string) => void;
	mode: ViewMode;
	setMode: (mode: ViewMode) => void;
	/** True when input is empty/whitespace only. */
	isEmpty: boolean;
	/** Syntax error, or null when the input is valid (or empty). */
	error: JsonError | null;
	/** Parsed value when valid, otherwise null. */
	parsed: unknown;
	/** Pretty-printed output (empty string when invalid). */
	beautified: string;
	/** Minified output (empty string when invalid). */
	minified: string;
	clear: () => void;
	copy: () => void;
};

export function useJsonFormatter(): UseJsonFormatter {
	const { toast } = useToast();

	const [input, setInput] = useState("");
	const [mode, setMode] = useState<ViewMode>("beautify");

	const isEmpty = input.trim() === "";

	const result = useMemo(() => parseJson(input), [input]);

	const error = result.ok ? null : result.error;
	const parsed = result.ok ? result.value : null;

	const beautified = useMemo(
		() => (result.ok && !isEmpty ? beautify(result.value) : ""),
		[result, isEmpty],
	);

	const minified = useMemo(
		() => (result.ok && !isEmpty ? minify(result.value) : ""),
		[result, isEmpty],
	);

	const clear = useCallback(() => {
		setInput("");
	}, []);

	const copy = useCallback(() => {
		const text = mode === "minify" ? minified : beautified;
		if (text.trim() === "") return;
		void copyText(text)
			.then(() =>
				toast(
					mode === "minify"
						? "Minified JSON copied to clipboard"
						: "Formatted JSON copied to clipboard",
					"success",
				),
			)
			.catch(() => toast("Couldn't access the clipboard", "error"));
	}, [mode, minified, beautified, toast]);

	return {
		input,
		setInput,
		mode,
		setMode,
		isEmpty,
		error,
		parsed,
		beautified,
		minified,
		clear,
		copy,
	};
}
