import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { FC } from "react";
import { cn } from "@/components/ui/cn";
import type { OpenApiDiagnosticsReport } from "@/lib/openApiDiagnostics";
import { describeDiagnosticCounts } from "@/lib/openApiDiagnostics";

type SwaggerParseStatusProps = {
	error: string;
	endpointCount: number;
	hasDoc: boolean;
	diagnostics: OpenApiDiagnosticsReport;
};

export const SwaggerParseStatus: FC<SwaggerParseStatusProps> = ({
	error,
	endpointCount,
	hasDoc,
	diagnostics,
}) => (
	<div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
		{error ? (
			<span className="inline-flex items-center gap-1.5 rounded-md border border-del/40 bg-del/10 px-2 py-1 text-del">
				<AlertTriangle className="h-3.5 w-3.5" />
				{error}
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
