import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { FC } from "react";
import { cn } from "@/components/ui/cn";
import { Spinner } from "@/components/ui/Spinner";
import type { OpenApiDiagnosticsReport } from "@/lib/openApiDiagnostics";
import { describeDiagnosticCounts } from "@/lib/openApiDiagnostics";
import { formatBytes, formatTokens, type SizeEstimate } from "@/lib/tokenEstimate";

type SwaggerParseStatusProps = {
	error: string;
	endpointCount: number;
	/** A large spec is still being indexed in the worker. */
	indexing?: boolean;
	hasDoc: boolean;
	diagnostics: OpenApiDiagnosticsReport;
	fullSpecSize: SizeEstimate | null;
};

export const SwaggerParseStatus: FC<SwaggerParseStatusProps> = ({
	error,
	endpointCount,
	indexing = false,
	hasDoc,
	diagnostics,
	fullSpecSize,
}) => (
	<div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
		{error ? (
			<span className="inline-flex items-center gap-1.5 rounded-md border border-del/40 bg-del/10 px-2 py-1 text-del">
				<AlertTriangle className="h-3.5 w-3.5" />
				{error}
			</span>
		) : hasDoc && indexing ? (
			<span className="inline-flex items-center gap-1.5 text-muted">
				<Spinner className="h-3.5 w-3.5" label="Indexing endpoints" />
				Indexing endpoints…
			</span>
		) : hasDoc ? (
			<>
				<span
					className={cn(
						"inline-flex items-center gap-1.5",
						diagnostics.diagnostics.length > 0
							? "text-muted"
							: "text-emerald-600 dark:text-emerald-400",
					)}
				>
					<CheckCircle2 className="h-3.5 w-3.5" />
					{endpointCount} endpoints detected
				</span>
				{fullSpecSize ? (
					<span
						className="font-mono text-[11px] text-muted"
						title="Size of the full spec as compact JSON. Tokens are approximate (~4 chars each)."
					>
						{formatTokens(fullSpecSize.tokens)} · {formatBytes(fullSpecSize.bytes)}
					</span>
				) : null}
				{diagnostics.diagnostics.length > 0 ? (
					<span
						className={cn(
							"inline-flex items-center gap-1.5 rounded-md border px-2 py-1",
							diagnostics.errorCount > 0
								? "border-del/40 bg-del/10 text-del"
								: "border-put/40 bg-put/10 text-put",
						)}
					>
						<AlertTriangle className="h-3.5 w-3.5" />
						{describeDiagnosticCounts(diagnostics)}
					</span>
				) : null}
			</>
		) : (
			<span className="text-muted">Paste JSON to start.</span>
		)}
	</div>
);
