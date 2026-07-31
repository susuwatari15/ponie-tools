"use client";

import { AlertTriangle, Copy } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";
import { MethodBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Collapsible } from "@/components/ui/Collapsible";
import { useToast } from "@/components/ui/ToastProvider";
import type {
	OpenApiDiagnostic,
	OpenApiDiagnosticsReport,
} from "@/lib/openApiDiagnostics";
import {
	describeDiagnosticCounts,
	formatDiagnosticsMarkdown,
} from "@/lib/openApiDiagnostics";
import { parseEndpointId } from "@/lib/swaggerMinifier";

export type SwaggerDiagnosticsPanelProps = {
	report: OpenApiDiagnosticsReport;
	/** Prefixes the header, e.g. the snapshot name in Swagger Compare. */
	label?: string;
	className?: string;
};

const DiagnosticRow: FC<{ diagnostic: OpenApiDiagnostic }> = ({
	diagnostic,
}) => (
	<li className="flex items-start gap-2">
		<span
			className={cn(
				"mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
				diagnostic.severity === "error" ? "bg-del" : "bg-put",
			)}
			aria-hidden
		/>
		<span className="min-w-0">
			<span className="block text-xs font-medium text-fg">
				{diagnostic.title}
			</span>
			<span className="block text-xs text-muted">{diagnostic.detail}</span>
		</span>
	</li>
);

/** Renders nothing when the report is clean. */
export const SwaggerDiagnosticsPanel: FC<SwaggerDiagnosticsPanelProps> = ({
	report,
	label,
	className,
}) => {
	const { toast } = useToast();
	const [open, setOpen] = useState(report.errorCount > 0);
	const [prevReport, setPrevReport] = useState(report);

	// A new report is a new spec: re-apply the "expand only for errors" default.
	if (report !== prevReport) {
		setPrevReport(report);
		setOpen(report.errorCount > 0);
	}

	if (report.diagnostics.length === 0) return null;

	const documentLevel = report.diagnostics.filter((d) => !d.endpointId);
	const hasErrors = report.errorCount > 0;

	// Tone goes on a ring rather than the border/background: `cn` is a plain
	// join, so overriding Collapsible's own `border-line bg-surface` would come
	// down to stylesheet order.
	const toneRing = hasErrors ? "ring-1 ring-del/50" : "ring-1 ring-put/50";

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(
				formatDiagnosticsMarkdown(report, label),
			);
			toast("Spec issues copied as Markdown", "success");
		} catch {
			toast("Couldn't access the clipboard", "error");
		}
	};

	return (
		<Collapsible
			open={open}
			onToggle={() => setOpen((previous) => !previous)}
			className={cn(toneRing, className)}
			title={
				<span className="flex items-center gap-2">
					<AlertTriangle
						className={cn("h-4 w-4", hasErrors ? "text-del" : "text-put")}
						aria-hidden
					/>
					{label ? `${label} — spec issues` : "Spec issues"}
				</span>
			}
			description={describeDiagnosticCounts(report)}
			actions={
				<Button
					size="sm"
					onClick={() => void handleCopy()}
					title="Copy these issues as Markdown"
					leftIcon={<Copy className="h-3.5 w-3.5" />}
				>
					Copy
				</Button>
			}
		>
			<div className="space-y-4">
				{documentLevel.length > 0 ? (
					<ul className="space-y-2">
						{documentLevel.map((diagnostic, index) => (
							<DiagnosticRow
								key={`${diagnostic.code}-${index}`}
								diagnostic={diagnostic}
							/>
						))}
					</ul>
				) : null}

				{[...report.byEndpoint].map(([endpointId, diagnostics]) => {
					const parsed = parseEndpointId(endpointId);
					return (
						<div key={endpointId} className="space-y-2">
							<div className="flex items-center gap-2">
								{parsed ? <MethodBadge method={parsed.method} /> : null}
								<span className="min-w-0 break-all font-mono text-xs text-fg">
									{parsed?.path ?? endpointId}
								</span>
							</div>
							<ul className="space-y-2 border-l border-line pl-3">
								{diagnostics.map((diagnostic, index) => (
									<DiagnosticRow
										key={`${diagnostic.code}-${index}`}
										diagnostic={diagnostic}
									/>
								))}
							</ul>
						</div>
					);
				})}
			</div>
		</Collapsible>
	);
};
