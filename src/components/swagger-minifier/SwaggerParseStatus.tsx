import { AlertTriangle } from "lucide-react";
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
	<div className="mt-2 flex flex-wrap items-center gap-2">
		{error ? (
			<span className="inline-flex items-center gap-1 text-xs text-rose-300">
				<AlertTriangle className="h-3.5 w-3.5" />
				{error}
			</span>
		) : hasDoc ? (
			<span className="text-xs text-emerald-300">
				{endpointCount} endpoints detected.
			</span>
		) : (
			<span className="text-xs text-slate-400">Paste JSON to start.</span>
		)}
	</div>
);
