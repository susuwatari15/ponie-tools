import type {
  CompressedSchema,
  EndpointItem,
  HttpMethod,
  MinifiedOperation,
  MinifiedRequest,
  MinifiedSwagger,
  OpenApiDocument,
  OperationObject,
  ParameterObject,
  ResponseObject,
  SchemaObject,
  SecurityRequirement,
  SecuritySchemeObject,
} from '../types/openapi';

export const HTTP_METHODS: HttpMethod[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
];

const SUCCESS_CODES = ['200', '201', '202', '203', '204', 'default'];

const getRefName = (ref: string): string => {
  const parts = ref.split('/');
  return parts[parts.length - 1] ?? ref;
};

const resolveSchemaRef = (schema: SchemaObject | undefined, doc: OpenApiDocument): SchemaObject | undefined => {
  if (!schema?.$ref) return schema;

  const refName = getRefName(schema.$ref);
  return doc.components?.schemas?.[refName] ?? doc.definitions?.[refName] ?? schema;
};

export const schemaToTs = (
  input: SchemaObject | undefined,
  doc: OpenApiDocument,
  seen = new Set<string>()
): string => {
  if (!input) return 'unknown';

  if (input.$ref) {
    const refName = getRefName(input.$ref);
    if (seen.has(refName)) return refName;

    const resolved = resolveSchemaRef(input, doc);
    if (!resolved || resolved === input) return refName;

    seen.add(refName);
    const resolvedType = schemaToTs(resolved, doc, seen);
    seen.delete(refName);
    return resolvedType || refName;
  }

  if (input.enum && input.enum.length > 0) {
    return input.enum
      .map((value) => {
        if (typeof value === 'string') return JSON.stringify(value);
        if (value === null) return 'null';
        return String(value);
      })
      .join(' | ');
  }

  if (input.oneOf && input.oneOf.length > 0) {
    return input.oneOf.map((s) => schemaToTs(s, doc, seen)).join(' | ');
  }

  if (input.anyOf && input.anyOf.length > 0) {
    return input.anyOf.map((s) => schemaToTs(s, doc, seen)).join(' | ');
  }

  if (input.allOf && input.allOf.length > 0) {
    return input.allOf.map((s) => schemaToTs(s, doc, seen)).join(' & ');
  }

  if (input.type === 'array') {
    return `${schemaToTs(input.items, doc, seen)}[]`;
  }

  if (input.type === 'object' || input.properties || input.additionalProperties) {
    const props = input.properties ?? {};
    const requiredSet = new Set(input.required ?? []);

    const fields = Object.entries(props).map(([name, schema]) => {
      const optional = requiredSet.has(name) ? '' : '?';
      return `${name}${optional}: ${schemaToTs(schema, doc, seen)}`;
    });

    if (fields.length > 0) {
      return `{ ${fields.join('; ')} }`;
    }

    if (typeof input.additionalProperties === 'object') {
      return `Record<string, ${schemaToTs(input.additionalProperties, doc, seen)}>`;
    }

    return 'Record<string, unknown>';
  }

  if (input.type === 'integer' || input.type === 'number') return 'number';
  if (input.type === 'string') return 'string';
  if (input.type === 'boolean') return 'boolean';
  if (input.type === 'null') return 'null';

  return 'unknown';
};

export type CompressOptions = {
  /**
   * Expand every `$ref` into the schema it points to (default). `false` keeps
   * refs as `{ $ref: name }`, so each named schema can be diffed once instead of
   * once per endpoint that reaches it.
   */
  inlineRefs?: boolean;
  /** Skip operations, parameters and properties flagged `deprecated: true`. */
  dropDeprecated?: boolean;
};

export const compressSchema = (
  input: SchemaObject | undefined,
  doc: OpenApiDocument,
  options: CompressOptions = {},
  seen = new Set<string>()
): CompressedSchema | undefined => {
  if (!input) return undefined;

  if (input.$ref) {
    const refName = getRefName(input.$ref);
    if (options.inlineRefs === false || seen.has(refName)) return { $ref: refName };

    const resolved = resolveSchemaRef(input, doc);
    if (!resolved || resolved === input) return { $ref: refName };

    seen.add(refName);
    const result = compressSchema(resolved, doc, options, seen);
    seen.delete(refName);
    return result ?? { $ref: refName };
  }

  const compressed: CompressedSchema = {};

  if (input.type) compressed.type = input.type;
  if (input.format) compressed.format = input.format;
  if (input.description) compressed.description = input.description;
  if (input.minimum !== undefined) compressed.minimum = input.minimum;
  if (input.maximum !== undefined) compressed.maximum = input.maximum;
  if (input.minLength !== undefined) compressed.minLength = input.minLength;
  if (input.maxLength !== undefined) compressed.maxLength = input.maxLength;
  if (input.minItems !== undefined) compressed.minItems = input.minItems;
  if (input.maxItems !== undefined) compressed.maxItems = input.maxItems;
  if (input.enum && input.enum.length > 0) compressed.enum = input.enum;
  if (input.example !== undefined) compressed.example = input.example;

  if (input.type === 'array' && input.items) {
    compressed.items = compressSchema(input.items, doc, options, seen);
  }

  if (input.properties) {
    const requiredSet = new Set(input.required ?? []);
    const props: Record<string, CompressedSchema> = {};

    for (const [name, schema] of Object.entries(input.properties)) {
      if (options.dropDeprecated && schema.deprecated) continue;
      const propCompressed = compressSchema(schema, doc, options, seen);
      if (propCompressed) {
        if (requiredSet.has(name)) {
          propCompressed.required = true;
        }
        props[name] = propCompressed;
      }
    }

    if (Object.keys(props).length > 0) {
      compressed.properties = props;
    }
  }

  if (typeof input.additionalProperties === 'object') {
    compressed.additionalProperties = compressSchema(input.additionalProperties, doc, options, seen);
  }

  return compressed;
};

const parameterToCompressed = (
  parameter: ParameterObject,
  doc: OpenApiDocument,
  options: CompressOptions
): CompressedSchema => {
  if (parameter.schema) {
    const compressed = compressSchema(parameter.schema, doc, options);
    if (compressed) {
      if (parameter.description && !compressed.description) {
        compressed.description = parameter.description;
      }
      if (parameter.required) compressed.required = true;
      return compressed;
    }
  }

  const result: CompressedSchema = {};

  if (parameter.type === 'array') {
    result.type = 'array';
    result.items = parameter.items ? compressSchema(parameter.items, doc, options) : { type: 'string' };
  } else {
    result.type = parameter.type ?? 'string';
  }

  if (parameter.format) result.format = parameter.format;
  if (parameter.description) result.description = parameter.description;
  if (parameter.required) result.required = true;
  if (parameter.minimum !== undefined) result.minimum = parameter.minimum;
  if (parameter.maximum !== undefined) result.maximum = parameter.maximum;
  if (parameter.minLength !== undefined) result.minLength = parameter.minLength;
  if (parameter.maxLength !== undefined) result.maxLength = parameter.maxLength;
  if (parameter.enum && parameter.enum.length > 0) result.enum = parameter.enum;

  return result;
};

const toEndpointId = (method: HttpMethod, path: string): string => `${method.toUpperCase()} ${path}`;

export const parseEndpointId = (id: string): { method: HttpMethod; path: string } | null => {
  const [methodToken, ...pathTokens] = id.split(' ');
  if (!methodToken || pathTokens.length === 0) return null;

  const method = methodToken.toLowerCase() as HttpMethod;
  if (!HTTP_METHODS.includes(method)) return null;

  return { method, path: pathTokens.join(' ') };
};

const pickPrimaryResponse = (responses: Record<string, ResponseObject> | undefined): ResponseObject | undefined => {
  if (!responses) return undefined;

  for (const code of SUCCESS_CODES) {
    if (responses[code]) return responses[code];
  }

  const firstCode = Object.keys(responses)[0];
  return firstCode ? responses[firstCode] : undefined;
};

const getResponseSchema = (response: ResponseObject | undefined): SchemaObject | undefined => {
  if (!response) return undefined;
  if (response.schema) return response.schema;

  if (!response.content) return undefined;

  const jsonLike =
    response.content['application/json'] ??
    response.content['application/*+json'] ??
    Object.values(response.content)[0];

  return jsonLike?.schema;
};

const getRequestBodySchema = (operation: OperationObject): SchemaObject | undefined => {
  if (operation.requestBody?.content) {
    const jsonLike =
      operation.requestBody.content['application/json'] ??
      operation.requestBody.content['application/*+json'] ??
      Object.values(operation.requestBody.content)[0];

    return jsonLike?.schema;
  }

  const bodyParameter = operation.parameters?.find((p) => p.in === 'body');
  return bodyParameter?.schema;
};

const buildRequest = (
  sharedParameters: ParameterObject[] | undefined,
  operationParameters: ParameterObject[] | undefined,
  operation: OperationObject,
  doc: OpenApiDocument,
  options: CompressOptions
): MinifiedRequest | undefined => {
  const mergedParameters = [...(sharedParameters ?? []), ...(operationParameters ?? [])];

  const request: MinifiedRequest = {};
  for (const parameter of mergedParameters) {
    if (!['path', 'query', 'header', 'cookie'].includes(parameter.in)) continue;
    if (options.dropDeprecated && parameter.deprecated) continue;

    const key = parameter.name;
    const compressed = parameterToCompressed(parameter, doc, options);

    if (parameter.in === 'path') request.path = { ...(request.path ?? {}), [key]: compressed };
    if (parameter.in === 'query') request.query = { ...(request.query ?? {}), [key]: compressed };
    if (parameter.in === 'header') request.header = { ...(request.header ?? {}), [key]: compressed };
    if (parameter.in === 'cookie') request.cookie = { ...(request.cookie ?? {}), [key]: compressed };
  }

  const requestBody = getRequestBodySchema(operation);
  if (requestBody) {
    request.body = compressSchema(requestBody, doc, options);
  }

  return Object.keys(request).length > 0 ? request : undefined;
};

export const buildEndpointIndex = (doc: OpenApiDocument): EndpointItem[] => {
  const endpoints: EndpointItem[] = [];

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;

      endpoints.push({
        id: toEndpointId(method, path),
        method,
        path,
        summary: operation.summary ?? operation.operationId ?? '',
        tags: operation.tags ?? [],
      });
    }
  }

  return endpoints;
};

export const minifySwaggerObject = (
  selectedEndpointIds: string[],
  doc: OpenApiDocument,
  options: CompressOptions = {}
): MinifiedSwagger => {
  const output: MinifiedSwagger = {
    openapi: doc.openapi ?? (doc.swagger ? `swagger-${doc.swagger}` : 'openapi-minified'),
    info: {
      title: doc.info?.title ?? 'Minified API',
      version: doc.info?.version ?? '0.0.0',
    },
    paths: {},
  };

  for (const endpointId of selectedEndpointIds) {
    const parsed = parseEndpointId(endpointId);
    if (!parsed) continue;

    const pathItem = doc.paths?.[parsed.path];
    const operation = pathItem?.[parsed.method];
    if (!pathItem || !operation) continue;
    if (options.dropDeprecated && operation.deprecated) continue;

    const minifiedOp: MinifiedOperation = {};

    if (operation.summary) {
      minifiedOp.summary = operation.summary;
    }
    if (operation.description) {
      minifiedOp.description = operation.description;
    }
    if (operation.operationId) {
      minifiedOp.operationId = operation.operationId;
    }
    if (operation.tags && operation.tags.length > 0) {
      minifiedOp.tags = operation.tags;
    }

    const request = buildRequest(pathItem.parameters, operation.parameters, operation, doc, options);
    if (request) {
      minifiedOp.request = request;
    }

    const responseSchema = getResponseSchema(pickPrimaryResponse(operation.responses));
    if (responseSchema) {
      minifiedOp.response = compressSchema(responseSchema, doc, options);
    }

    output.paths[parsed.path] = {
      ...(output.paths[parsed.path] ?? {}),
      [parsed.method]: minifiedOp,
    };
  }

  return output;
};

export const getMinifiedOperationForEndpoint = (
  id: string,
  doc: OpenApiDocument,
  options: CompressOptions = {}
): MinifiedOperation | undefined => {
  const parsed = parseEndpointId(id);
  if (!parsed) return undefined;

  const minified = minifySwaggerObject([id], doc, options);
  const pathItem = minified.paths[parsed.path];
  if (!pathItem) return undefined;

  return pathItem[parsed.method];
};

export type MinifyOptions = {
  stripDescriptions: boolean;
  stripExamples: boolean;
  dropDeprecated: boolean;
  /** `false` keeps `{ $ref }` in place and emits each named schema once under `schemas`. */
  inlineRefs: boolean;
  /** Emit each operation's effective `security` plus the schemes it references. */
  keepSecuritySchemes: boolean;
};

export const DEFAULT_MINIFY_OPTIONS: MinifyOptions = {
  stripDescriptions: false,
  stripExamples: false,
  dropDeprecated: false,
  inlineRefs: true,
  keepSecuritySchemes: false,
};

const collectSchemaRefs = (schema: CompressedSchema | undefined, into: Set<string>): void => {
  if (!schema) return;
  if (schema.$ref) into.add(schema.$ref);
  collectSchemaRefs(schema.items, into);
  for (const property of Object.values(schema.properties ?? {})) collectSchemaRefs(property, into);
  if (typeof schema.additionalProperties === 'object') {
    collectSchemaRefs(schema.additionalProperties, into);
  }
};

const forEachOperation = (spec: MinifiedSwagger, visit: (op: MinifiedOperation) => void): void => {
  for (const pathItem of Object.values(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (op) visit(op);
    }
  }
};

const forEachOperationSchema = (op: MinifiedOperation, visit: (schema: CompressedSchema) => void): void => {
  for (const group of ['path', 'query', 'header', 'cookie'] as const) {
    for (const schema of Object.values(op.request?.[group] ?? {})) visit(schema);
  }
  if (op.request?.body) visit(op.request.body);
  if (op.response) visit(op.response);
};

/** Compresses every named schema reachable from the output's `$ref`s, transitively. */
const buildReferencedSchemas = (
  spec: MinifiedSwagger,
  doc: OpenApiDocument,
  options: CompressOptions
): Record<string, CompressedSchema> => {
  const seen = new Set<string>();
  forEachOperation(spec, (op) => forEachOperationSchema(op, (schema) => collectSchemaRefs(schema, seen)));

  const schemas: Record<string, CompressedSchema> = {};
  const queue = Array.from(seen);
  while (queue.length > 0) {
    const name = queue.shift() as string;
    const source = doc.components?.schemas?.[name] ?? doc.definitions?.[name];
    const compressed = source ? compressSchema(source, doc, options) : undefined;
    if (!compressed) continue;

    schemas[name] = compressed;
    const nested = new Set<string>();
    collectSchemaRefs(compressed, nested);
    for (const ref of nested) {
      if (seen.has(ref)) continue;
      seen.add(ref);
      queue.push(ref);
    }
  }

  return Object.fromEntries(Object.entries(schemas).sort(([a], [b]) => a.localeCompare(b)));
};

/** Adds each operation's effective `security` and the schemes those requirements name. */
const attachSecurity = (spec: MinifiedSwagger, doc: OpenApiDocument): void => {
  const definitions = doc.components?.securitySchemes ?? doc.securityDefinitions ?? {};
  const used = new Set<string>();

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op) continue;

      const security: SecurityRequirement[] | undefined = doc.paths?.[path]?.[method]?.security ?? doc.security;
      if (!security) continue;

      op.security = security;
      for (const requirement of security) {
        for (const name of Object.keys(requirement)) used.add(name);
      }
    }
  }

  const schemes: Record<string, SecuritySchemeObject> = {};
  for (const name of used) {
    if (definitions[name]) schemes[name] = definitions[name];
  }
  if (Object.keys(schemes).length > 0) spec.securitySchemes = schemes;
};

type StripFields = { description: boolean; example: boolean };

const stripSchema = (schema: CompressedSchema | undefined, strip: StripFields): void => {
  if (!schema) return;
  if (strip.description) delete schema.description;
  if (strip.example) delete schema.example;
  stripSchema(schema.items, strip);
  for (const property of Object.values(schema.properties ?? {})) stripSchema(property, strip);
  if (typeof schema.additionalProperties === 'object') stripSchema(schema.additionalProperties, strip);
};

/** Walks the output structurally, so a property *named* `description` is never removed. */
const stripFields = (spec: MinifiedSwagger, strip: StripFields): void => {
  forEachOperation(spec, (op) => {
    if (strip.description) delete op.description;
    forEachOperationSchema(op, (schema) => stripSchema(schema, strip));
  });
  for (const schema of Object.values(spec.schemas ?? {})) stripSchema(schema, strip);

  if (strip.description && spec.securitySchemes) {
    spec.securitySchemes = Object.fromEntries(
      Object.entries(spec.securitySchemes).map(([name, scheme]) => {
        const rest = { ...scheme };
        delete rest.description;
        return [name, rest];
      })
    );
  }
};

/**
 * Minifies the selected endpoints and applies `options`. Deprecation and ref
 * handling need the source doc, so they run during extraction; the remaining
 * options are transforms over the freshly built output.
 */
export const minifySwaggerWithOptions = (
  selectedEndpointIds: string[],
  doc: OpenApiDocument,
  options: MinifyOptions = DEFAULT_MINIFY_OPTIONS
): MinifiedSwagger => {
  const compressOptions: CompressOptions = {
    inlineRefs: options.inlineRefs,
    dropDeprecated: options.dropDeprecated,
  };
  const output = minifySwaggerObject(selectedEndpointIds, doc, compressOptions);

  if (!options.inlineRefs) {
    const schemas = buildReferencedSchemas(output, doc, compressOptions);
    if (Object.keys(schemas).length > 0) output.schemas = schemas;
  }
  if (options.keepSecuritySchemes) attachSecurity(output, doc);
  if (options.stripDescriptions || options.stripExamples) {
    stripFields(output, { description: options.stripDescriptions, example: options.stripExamples });
  }

  return output;
};

export const minifySwagger = (
  selectedEndpointIds: string[],
  doc: OpenApiDocument,
  options: MinifyOptions = DEFAULT_MINIFY_OPTIONS
): string => JSON.stringify(minifySwaggerWithOptions(selectedEndpointIds, doc, options), null, 2);

export const fetchSwaggerFromUrl = async (
  url: string,
  username?: string,
  password?: string
): Promise<string> => {
  if (!url.trim()) {
    throw new Error('Swagger URL is required.');
  }

  const response = await fetch('/api/fetch-swagger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, username, password }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `Failed to fetch swagger (${response.status}).`);
  }

  return JSON.stringify(result.data, null, 2);
};
