import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { getLatestTwoSnapshotIdsForCompare } from "../../utils/swaggerSavedSnapshotsStorage";
import SwaggerMinifier from "./components/SwaggerMinifier";
import { useSwaggerMinifier } from "./hooks/useSwaggerMinifier";
import { mutedText, panelClasses, themeClasses } from "./styles";

type SwaggerMinifierPageProps = {
	className?: string;
};

export const SwaggerMinifierPage: FC<SwaggerMinifierPageProps> = ({
	className = "",
}) => {
	const m = useSwaggerMinifier("");
	const navigate = useNavigate();

	const handleCompareToLatestVersion = () => {
		const pair = getLatestTwoSnapshotIdsForCompare();
		if (pair) {
			navigate("/swagger-compare", {
				state: { compareSnapshotIds: pair },
			});
		} else {
			navigate("/swagger-compare");
		}
	};

	return (
		<div className={`w-full space-y-4 p-4 lg:p-6 ${themeClasses} ${className}`}>
			<PageHeader
				title="Swagger Minifier"
				titleAs="h1"
				titleClassName="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
				description="Select only the endpoints you need and generate a compact, prompt-ready swagger view."
				descriptionClassName={`text-sm ${mutedText}`}
				wrapperClassName={`rounded-xl border px-4 py-3 ${panelClasses}`}
			/>
			<SwaggerMinifier embedded m={m} onNavigateToCompareLatest={handleCompareToLatestVersion} />
		</div>
	);
};
