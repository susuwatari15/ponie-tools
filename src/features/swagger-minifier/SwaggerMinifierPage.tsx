import type { FC } from "react";
import { useSwaggerMinifier } from "./hooks/useSwaggerMinifier";
import { PageHeader } from "../../components/layout/PageHeader";
import SwaggerMinifier from "./components/SwaggerMinifier";

type SwaggerMinifierPageProps = {
	className?: string;
};

export const SwaggerMinifierPage: FC<SwaggerMinifierPageProps> = ({
	className = "",
}) => {
	const m = useSwaggerMinifier("");

	return (
		<div
			className={`w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/95 text-slate-900 shadow-glow backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100 ${className}`}
		>
			<PageHeader
				title="Swagger Minifier"
				titleAs="h1"
				titleClassName="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
				description="Select only the endpoints you need and generate a compact, prompt-ready swagger view."
				descriptionClassName="mt-1 text-sm text-slate-600 dark:text-slate-400"
				wrapperClassName="rounded-none border-0 border-b border-slate-200 bg-white/95 px-4 py-4 dark:border-slate-700/70 dark:bg-slate-900/80 lg:px-6"
			/>
			<SwaggerMinifier embedded m={m} />
		</div>
	);
};
