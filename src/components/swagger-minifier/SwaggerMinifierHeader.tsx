import type { FC } from "react";

export const SwaggerMinifierHeader: FC = () => (
	<div className="border-b border-slate-700/70 bg-slate-900/80 px-4 py-4 lg:px-6">
		<h1 className="text-lg font-semibold tracking-tight text-slate-100">
			Swagger Minifier
		</h1>
		<p className="mt-1 text-sm text-slate-400">
			Select only the endpoints you need and generate a compact, prompt-ready
			swagger view.
		</p>
	</div>
);
