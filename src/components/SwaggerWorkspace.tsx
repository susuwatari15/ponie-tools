import type { FC } from "react";
import { useSwaggerMinifier } from "../hooks/useSwaggerMinifier";
import SwaggerMinifier from "./swagger-minifier/SwaggerMinifier";

type SwaggerWorkspaceProps = {
	className?: string;
};

export const SwaggerWorkspace: FC<SwaggerWorkspaceProps> = ({ className = "" }) => {
	const m = useSwaggerMinifier("");

	return (
		<div className={className}>
			<SwaggerMinifier embedded m={m} />
		</div>
	);
};
