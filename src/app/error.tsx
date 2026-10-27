"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Route-segment error boundary. It renders inside the root layout, so a crash
 * in one tool page replaces only the content area — the header, sidebar and
 * command bar keep working, and navigating to another tool resets it.
 */
export default function RouteError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className="mx-auto w-full max-w-2xl p-4 sm:p-6 sm:pt-14">
			<Card>
				<EmptyState
					tone="error"
					icon={TriangleAlert}
					title="This tool hit an error"
					description="Something in this page crashed — often a spec or input it couldn't handle. Your saved data is untouched."
					action={
						<div className="flex flex-wrap items-center justify-center gap-2">
							<Button
								variant="primary"
								onClick={reset}
								leftIcon={<RotateCcw className="h-4 w-4" />}
							>
								Try again
							</Button>
							<Link
								href="/"
								className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-fg transition hover:border-muted/50 hover:bg-raised"
							>
								Back to Home
							</Link>
						</div>
					}
				/>
				{error.message || error.digest ? (
					<details className="mt-3 rounded-lg border border-line bg-raised/50 px-3 py-2 text-xs text-muted">
						<summary className="cursor-pointer select-none font-medium text-fg">
							Error details
						</summary>
						<pre className="scroll-ide mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px]">
							{error.message}
							{error.digest ? `\n\ndigest: ${error.digest}` : ""}
						</pre>
					</details>
				) : null}
			</Card>
		</div>
	);
}
