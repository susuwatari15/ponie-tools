import type { OpenApiDocument } from "../types/openapi";
import { parseEndpointId } from "./swaggerMinifier";

export type SwaggerCopyFormat = "full" | "short";

export function formatSwaggerEndpointsShort(
	doc: OpenApiDocument,
	endpointIds: string[]
): string {
	// const moduleName = doc.info?.title?.trim() || "API";
	const moduleName =  "mch";
	const lines = [`Module: ${moduleName}`, "API endpoints and methods:"];

	for (const endpointId of endpointIds) {
		const parsed = parseEndpointId(endpointId);
		if (!parsed) continue;
		lines.push(`  - ${parsed.method.toUpperCase()} ${parsed.path}`);
	}

	return lines.join("\n");
}
