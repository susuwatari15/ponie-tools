import type { TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "./cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
	mono?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, mono = true, ...rest }, ref) => (
		<textarea
			ref={ref}
			className={cn(
				"scroll-ide w-full rounded-lg border border-line bg-surface p-3 text-xs text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25",
				mono && "font-mono leading-relaxed",
				className,
			)}
			{...rest}
		/>
	),
);
Textarea.displayName = "Textarea";
