import type { CompressedSchema, MinifiedOperation, OpenApiDocument } from "../types/openapi";
import { compressSchema, type CompressOptions } from "./swaggerMinifier";

/**
 * Minify with `$ref`s kept as names. Fully inlining them repeats every shared
 * schema inside each endpoint that reaches it, which grows exponentially with
 * nesting — so large specs are compared schema-by-schema instead.
 */
export const SHALLOW: CompressOptions = { inlineRefs: false };

/** Canonical string -> small id. Shared by both sides so their ids compare. */
export type Intern = (key: string) => number;

export function createIntern(): Intern {
	const ids = new Map<string, number>();
	return (key) => {
		let id = ids.get(key);
		if (id === undefined) {
			id = ids.size;
			ids.set(key, id);
		}
		return id;
	};
}

/** A minified node with every child schema replaced by its interned id. */
type Flat = Record<string, unknown>;

export type SchemaIndex = {
	/** Minified schema with nested `$ref`s kept as names. */
	shallow: Map<string, CompressedSchema | undefined>;
	serialized: Map<string, string>;
	/** Schema name -> names it references. */
	refs: Map<string, Set<string>>;
	/**
	 * Equal across two indexes (same intern) exactly when the schema's fully
	 * inlined form would serialize identically. Schemas on a `$ref` cycle are
	 * fingerprinted by name plus the whole cycle's content — never a false
	 * "unchanged", at worst a false "changed" when a cycle is only renamed.
	 */
	fingerprint: (name: string) => string;
	/** Fingerprint of a minified operation, on the same terms. */
	fingerprintOperation: (op: MinifiedOperation | undefined) => string;
};

/** Schema names referenced by a minified node. Only structural keys are walked, not `example`. */
export function collectRefs(node: CompressedSchema | undefined, into: Set<string>): void {
	if (!node) return;
	if (node.$ref) into.add(node.$ref);
	collectRefs(node.items, into);
	for (const child of Object.values(node.properties ?? {})) collectRefs(child, into);
	if (typeof node.additionalProperties === "object") {
		collectRefs(node.additionalProperties, into);
	}
}

export function collectOperationRefs(op: MinifiedOperation | undefined, into: Set<string>): void {
	if (!op) return;
	const { request } = op;
	for (const group of [request?.path, request?.query, request?.header, request?.cookie]) {
		for (const schema of Object.values(group ?? {})) collectRefs(schema, into);
	}
	collectRefs(request?.body, into);
	collectRefs(op.response, into);
}

/**
 * Hash-conses a minified node: children become interned ids, so two nodes get
 * the same id exactly when their inlined JSON would match. `refForm` supplies
 * the flat form a `$ref` expands to, or undefined when the minifier would leave
 * it as a bare `{ $ref }`.
 */
function flatten(
	node: CompressedSchema,
	refForm: (name: string) => Flat | undefined,
	intern: Intern,
): Flat {
	const idOf = (child: CompressedSchema) =>
		intern(JSON.stringify(flatten(child, refForm, intern)));

	if (node.$ref !== undefined) {
		const target = refForm(node.$ref);
		const flat: Flat = target ? { ...target } : { $ref: node.$ref };
		// Same decoration the minifier applies to an inlined ref: `required` from
		// the parent, and a parameter description only when the schema has none.
		for (const [key, value] of Object.entries(node)) {
			if (key === "$ref") continue;
			if (key === "description" && flat.description) continue;
			flat[key] = value;
		}
		return flat;
	}

	const flat: Flat = {};
	for (const [key, value] of Object.entries(node)) {
		if ((key === "items" || key === "additionalProperties") && typeof value === "object") {
			flat[key] = idOf(value as CompressedSchema);
		} else if (key === "properties") {
			flat[key] = Object.fromEntries(
				Object.entries(value as Record<string, CompressedSchema>).map(([name, child]) => [
					name,
					idOf(child),
				]),
			);
		} else {
			flat[key] = value;
		}
	}
	return flat;
}

/**
 * Strongly connected components of the `$ref` graph (iterative Tarjan, so a
 * long chain of schemas can't overflow the stack). Components come out
 * sinks-first: everything a component references is emitted before it.
 */
function stronglyConnected(edges: Map<string, Set<string>>): string[][] {
	const index = new Map<string, number>();
	const low = new Map<string, number>();
	const stack: string[] = [];
	const onStack = new Set<string>();
	const components: string[][] = [];

	for (const root of edges.keys()) {
		if (index.has(root)) continue;

		const work: { node: string; children: Iterator<string> }[] = [];
		const open = (node: string) => {
			index.set(node, index.size);
			low.set(node, index.get(node)!);
			stack.push(node);
			onStack.add(node);
			work.push({ node, children: edges.get(node)!.values() });
		};
		open(root);

		while (work.length > 0) {
			const frame = work[work.length - 1]!;
			const next = frame.children.next();
			if (!next.done) {
				const child = next.value;
				// Unresolvable refs aren't nodes.
				if (!edges.has(child)) continue;
				if (!index.has(child)) open(child);
				else if (onStack.has(child)) {
					low.set(frame.node, Math.min(low.get(frame.node)!, index.get(child)!));
				}
				continue;
			}

			work.pop();
			const parent = work[work.length - 1];
			if (parent) {
				low.set(parent.node, Math.min(low.get(parent.node)!, low.get(frame.node)!));
			}
			if (low.get(frame.node) !== index.get(frame.node)) continue;

			const component: string[] = [];
			let member: string;
			do {
				member = stack.pop()!;
				onStack.delete(member);
				component.push(member);
			} while (member !== frame.node);
			components.push(component);
		}
	}

	return components;
}

/** Minifies every named schema once and fingerprints it. */
export function indexSchemas(doc: OpenApiDocument, intern: Intern): SchemaIndex {
	const shallow = new Map<string, CompressedSchema | undefined>();
	const serialized = new Map<string, string>();
	const refs = new Map<string, Set<string>>();

	const names = new Set([
		...Object.keys(doc.components?.schemas ?? {}),
		...Object.keys(doc.definitions ?? {}),
	]);
	for (const name of names) {
		// Same precedence as the minifier's `$ref` lookup.
		const schema = doc.components?.schemas?.[name] ?? doc.definitions?.[name];
		if (schema == null) continue;
		const minified = compressSchema(schema, doc, SHALLOW);
		const children = new Set<string>();
		collectRefs(minified, children);
		shallow.set(name, minified);
		serialized.set(name, JSON.stringify(minified ?? null));
		refs.set(name, children);
	}

	const refForms = new Map<string, Flat>();
	const refForm = (name: string) => refForms.get(name);

	for (const component of stronglyConnected(refs)) {
		const first = component[0]!;
		const cyclic = component.length > 1 || refs.get(first)!.has(first);

		if (!cyclic) {
			const node = shallow.get(first);
			if (node) refForms.set(first, flatten(node, refForm, intern));
			continue;
		}

		// Inlining inside a cycle depends on the path it was entered from, so the
		// cycle is fingerprinted as a whole: member names plus their content.
		const members = new Set(component);
		const inner = (name: string): Flat | undefined =>
			members.has(name) ? { $cycleRef: name } : refForms.get(name);
		const signature = intern(
			JSON.stringify(
				[...component].sort().map((name) => {
					const node = shallow.get(name);
					return [name, node ? flatten(node, inner, intern) : null];
				}),
			),
		);
		for (const name of component) {
			refForms.set(name, { $cycle: name, $signature: signature });
		}
	}

	const idOf = (node: CompressedSchema) =>
		intern(JSON.stringify(flatten(node, refForm, intern)));
	const idsOf = (group: Record<string, CompressedSchema> | undefined) =>
		group &&
		Object.fromEntries(Object.entries(group).map(([name, schema]) => [name, idOf(schema)]));

	return {
		shallow,
		serialized,
		refs,
		fingerprint: (name) => {
			const form = refForms.get(name);
			return form ? `#${intern(JSON.stringify(form))}` : "?";
		},
		fingerprintOperation: (op) => {
			if (!op) return "null";
			const { request } = op;
			return JSON.stringify({
				...op,
				request: request && {
					...request,
					path: idsOf(request.path),
					query: idsOf(request.query),
					header: idsOf(request.header),
					cookie: idsOf(request.cookie),
					body: request.body && idOf(request.body),
				},
				response: op.response && idOf(op.response),
			});
		},
	};
}
