import type {
	CompressedSchema,
	HttpMethod,
	MinifiedOperation,
	MinifiedSwagger,
} from "@/types/openapi";
import { HTTP_METHOD_ORDER } from "@/components/ui/methodColors";

/** One operation from the minified spec, flattened for the brick view. */
export type SpecOperation = {
	id: string;
	method: HttpMethod;
	path: string;
	op: MinifiedOperation;
	/** Path relative to its baseplate, e.g. `/{id}/roles` on `/api/v1/users`. */
	localPath: string;
	/** Leaf fields across params, body and response — the brick's "weight". */
	fieldCount: number;
	/** Brick width in studs (3–8), scaled from `fieldCount`. */
	studs: number;
};

/** A resource group — one baseplate holding the bricks under a shared prefix. */
export type SpecPlate = {
	key: string;
	operations: SpecOperation[];
	totalStuds: number;
};

export const METHOD_SHORT_LABEL: Record<HttpMethod, string> = {
	get: "GET",
	post: "POST",
	put: "PUT",
	patch: "PATCH",
	delete: "DEL",
	options: "OPT",
	head: "HEAD",
	trace: "TRC",
};

const PARAM_GROUPS = ["path", "query", "header", "cookie"] as const;

/** Leading segments that never name a resource (`/api`, `/v1`, `/rest`…). */
const PREFIX_SEGMENT = /^(api|rest|public|internal|v\d+(\.\d+)?)$/i;

export function parseMinifiedSpec(json: string): MinifiedSwagger | null {
	if (!json) return null;
	try {
		const parsed = JSON.parse(json) as MinifiedSwagger;
		return parsed && typeof parsed === "object" && parsed.paths ? parsed : null;
	} catch {
		return null;
	}
}

/** `/api/v1/users/{id}` → plate `/api/v1/users`, local path `/{id}`. */
export function splitResourcePath(path: string): { plate: string; local: string } {
	const segments = path.split("/").filter(Boolean);
	let index = 0;
	while (index < segments.length - 1 && PREFIX_SEGMENT.test(segments[index])) index += 1;
	if (segments.length === 0) return { plate: "/", local: "/" };
	const plate = `/${segments.slice(0, index + 1).join("/")}`;
	const rest = segments.slice(index + 1);
	return { plate, local: rest.length > 0 ? `/${rest.join("/")}` : "/" };
}

export const studsForFields = (fields: number): number =>
	Math.min(8, Math.max(3, 2 + Math.ceil(Math.log2(fields + 1))));

const operationFieldCount = (op: MinifiedOperation): number => {
	let count = 0;
	for (const group of PARAM_GROUPS) count += Object.keys(op.request?.[group] ?? {}).length;
	if (op.request?.body) count += countSchemaFields(op.request.body);
	if (op.response) count += countSchemaFields(op.response);
	return count;
};

export function collectOperations(spec: MinifiedSwagger): SpecOperation[] {
	const operations: SpecOperation[] = [];
	const paths = Object.keys(spec.paths).sort((a, b) => a.localeCompare(b));
	for (const path of paths) {
		const pathItem = spec.paths[path];
		for (const method of HTTP_METHOD_ORDER) {
			const op = pathItem[method];
			if (!op) continue;
			const fieldCount = operationFieldCount(op);
			operations.push({
				id: `${method.toUpperCase()} ${path}`,
				method,
				path,
				op,
				localPath: splitResourcePath(path).local,
				fieldCount,
				studs: studsForFields(fieldCount),
			});
		}
	}
	return operations;
}

export function groupIntoPlates(operations: SpecOperation[]): SpecPlate[] {
	const plates = new Map<string, SpecPlate>();
	for (const operation of operations) {
		const key = splitResourcePath(operation.path).plate;
		const plate = plates.get(key) ?? { key, operations: [], totalStuds: 0 };
		plate.operations.push(operation);
		plate.totalStuds += operation.studs;
		plates.set(key, plate);
	}
	return Array.from(plates.values());
}

/** Human-readable type of a compressed schema, e.g. `User[]` or `map<string, int>`. */
export function schemaTypeLabel(schema: CompressedSchema | undefined): string {
	if (!schema) return "unknown";
	if (schema.$ref) return schema.$ref;
	if (schema.type === "array") return `${schemaTypeLabel(schema.items)}[]`;
	if (typeof schema.additionalProperties === "object" && !schema.properties) {
		return `map<string, ${schemaTypeLabel(schema.additionalProperties)}>`;
	}
	if (schema.properties) return "object";
	return schema.type ?? "any";
}

/** Fields nested under a schema; arrays and maps expose their element's fields. */
export function schemaChildren(
	schema: CompressedSchema | undefined,
): Array<[string, CompressedSchema]> {
	if (!schema) return [];
	if (schema.type === "array") return schemaChildren(schema.items);
	if (schema.properties) return Object.entries(schema.properties);
	if (typeof schema.additionalProperties === "object") {
		const value = schema.additionalProperties;
		return value.properties ? Object.entries(value.properties) : [];
	}
	return [];
}

/** Count every leaf field in a schema — a rough "payload weight". */
export function countSchemaFields(schema: CompressedSchema | undefined, depth = 0): number {
	if (!schema || depth > 12) return 0;
	const children = schemaChildren(schema);
	if (children.length === 0) return 1;
	return children.reduce((sum, [, child]) => sum + countSchemaFields(child, depth + 1), 0);
}

/** Color family of a schema, used for its brick. */
export type SchemaKind = "string" | "number" | "boolean" | "object" | "array" | "ref" | "any";

export function schemaKind(schema: CompressedSchema): SchemaKind {
	if (schema.$ref) return "ref";
	switch (schema.type) {
		case "string":
			return "string";
		case "integer":
		case "number":
			return "number";
		case "boolean":
			return "boolean";
		case "array":
			return "array";
		case "object":
			return "object";
		default:
			return schema.properties ? "object" : "any";
	}
}
