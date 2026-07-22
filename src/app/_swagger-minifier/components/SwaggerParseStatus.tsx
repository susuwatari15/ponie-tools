import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { FC } from "react";

type SwaggerParseStatusProps = {
	error: string;
	endpointCount: number;
	hasDoc: boolean;
};

export const SwaggerParseStatus: FC<SwaggerParseStatusProps> = ({
	error,
	endpointCount,
	hasDoc,
}) => (
	<div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
		{error ? (
			<span className="inline-flex items-center gap-1.5 rounded-md border border-del/40 bg-del/10 px-2 py-1 text-del">
				<AlertTriangle className="h-3.5 w-3.5" />
				{error}
			</span>
		) : hasDoc ? (
			<span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
				<CheckCircle2 className="h-3.5 w-3.5" />
				{endpointCount} endpoints detected
			</span>
		) : (
			<span className="text-muted">Paste JSON to start.</span>
		)}
	</div>
);
