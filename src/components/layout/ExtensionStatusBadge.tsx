"use client";

import { Puzzle, RefreshCw } from "lucide-react";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Popover } from "@/components/ui/Popover";
import { useExtensionStatus } from "./ExtensionStatusProvider";

const STATUS_LABEL = {
	checking: "checking…",
	connected: "connected",
	missing: "not detected",
} as const;

const INSTALL_STEPS = [
	"Open chrome://extensions and turn on Developer mode.",
	"Click “Load unpacked” and pick the repo’s extension/ folder.",
	"Reload this tab — content scripts don’t attach to pages already open.",
	"After pulling extension changes, hit ↻ on its card and reload the tab.",
];

/** Header chip for the companion Chrome extension, with details in a popover. */
export const ExtensionStatusBadge: FC = () => {
	const { status, info, recheck } = useExtensionStatus();
	const [rechecking, setRechecking] = useState(false);

	const onRecheck = async () => {
		setRechecking(true);
		await recheck();
		setRechecking(false);
	};

	return (
		<Popover
			label="Browser extension status"
			// Below `sm` the chip sits mid-header, so pin the panel to the viewport edges.
			panelClassName="w-80 p-3 max-sm:fixed max-sm:inset-x-4 max-sm:top-14 max-sm:w-auto"
			trigger={({ triggerProps }) => (
				<button
					type="button"
					{...triggerProps}
					title={`Browser extension: ${STATUS_LABEL[status]}`}
					className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-muted transition hover:border-muted/50 hover:text-fg"
				>
					<span
						className={cn(
							"h-2 w-2 shrink-0 rounded-full",
							status === "connected"
								? "bg-emerald-500 dark:bg-emerald-400"
								: status === "missing"
									? "bg-slate-400 dark:bg-slate-500"
									: "animate-pulse bg-amber-500 dark:bg-amber-400",
						)}
						aria-hidden
					/>
					<Puzzle className="h-3.5 w-3.5 sm:hidden" aria-hidden />
					<span className="hidden sm:inline">
						Extension · <span className="text-fg">{STATUS_LABEL[status]}</span>
					</span>
				</button>
			)}
		>
			{() => (
				<div className="space-y-3 text-xs">
					<div>
						<p className="font-mono text-[10px] uppercase tracking-widest text-muted">
							// browser extension
						</p>
						<p className="mt-1 text-sm font-semibold text-fg">Ponie Swagger Fetcher</p>
						<p className="mt-1 text-muted">
							{status === "connected"
								? "Connected — auth-gated specs are fetched with your browser session."
								: status === "missing"
									? "Not detected — URL fetches go through the server route with the profile’s basic auth."
									: "Looking for the extension…"}
						</p>
					</div>

					{status === "connected" && info ? (
						<dl className="space-y-1.5 rounded-lg border border-line bg-raised/50 p-2">
							<div className="flex justify-between gap-3">
								<dt className="text-muted">Version</dt>
								<dd className="font-mono text-fg">{info.version}</dd>
							</div>
							<div>
								<dt className="text-muted">Allowed hosts</dt>
								<dd className="mt-0.5 space-y-0.5 font-mono text-[11px] text-fg">
									{info.hosts ? (
										info.hosts.length > 0 ? (
											info.hosts.map((host) => (
												<span key={host} className="block break-all">
													{host}
												</span>
											))
										) : (
											<span className="text-muted">none</span>
										)
									) : (
										<span className="font-sans text-muted">
											Not reported — reload the extension to update it.
										</span>
									)}
								</dd>
							</div>
						</dl>
					) : null}

					{status === "missing" ? (
						<div>
							<p className="mb-1 font-medium text-fg">Install (unpacked)</p>
							<ol className="list-decimal space-y-1 pl-4 text-muted">
								{INSTALL_STEPS.map((step) => (
									<li key={step}>{step}</li>
								))}
							</ol>
							<p className="mt-1.5 text-[11px] text-muted">
								Full guide:{" "}
								<code className="font-mono">
									docs/plans/chrome-extension/04-install-and-test.md
								</code>
							</p>
						</div>
					) : null}

					<Button
						size="sm"
						className="w-full"
						onClick={onRecheck}
						disabled={rechecking}
						leftIcon={
							<RefreshCw className={cn("h-3.5 w-3.5", rechecking && "animate-spin")} aria-hidden />
						}
					>
						Re-check
					</Button>
				</div>
			)}
		</Popover>
	);
};
