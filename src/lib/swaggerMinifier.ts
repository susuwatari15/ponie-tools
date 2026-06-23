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

export const compressSchema = (
  input: SchemaObject | undefined,
  doc: OpenApiDocument,
  seen = new Set<string>()
): CompressedSchema | undefined => {
  if (!input) return undefined;

  if (input.$ref) {
    const refName = getRefName(input.$ref);
    if (seen.has(refName)) return { $ref: refName };

    const resolved = resolveSchemaRef(input, doc);
    if (!resolved || resolved === input) return { $ref: refName };

    seen.add(refName);
    const result = compressSchema(resolved, doc, seen);
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
    compressed.items = compressSchema(input.items, doc, seen);
  }

  if (input.properties) {
    const requiredSet = new Set(input.required ?? []);
    const props: Record<string, CompressedSchema> = {};

    for (const [name, schema] of Object.entries(input.properties)) {
      const propCompressed = compressSchema(schema, doc, seen);
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
    compressed.additionalProperties = compressSchema(input.additionalProperties, doc, seen);
  }

  return compressed;
};

const parameterToCompressed = (
  parameter: ParameterObject,
  doc: OpenApiDocument
): CompressedSchema => {
  if (parameter.schema) {
    const compressed = compressSchema(parameter.schema, doc);
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
    result.items = parameter.items ? compressSchema(parameter.items, doc) : { type: 'string' };
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
  doc: OpenApiDocument
): MinifiedRequest | undefined => {
  const mergedParameters = [...(sharedParameters ?? []), ...(operationParameters ?? [])];

  const request: MinifiedRequest = {};
  for (const parameter of mergedParameters) {
    if (!['path', 'query', 'header', 'cookie'].includes(parameter.in)) continue;

    const key = parameter.name;
    const compressed = parameterToCompressed(parameter, doc);

    if (parameter.in === 'path') request.path = { ...(request.path ?? {}), [key]: compressed };
    if (parameter.in === 'query') request.query = { ...(request.query ?? {}), [key]: compressed };
    if (parameter.in === 'header') request.header = { ...(request.header ?? {}), [key]: compressed };
    if (parameter.in === 'cookie') request.cookie = { ...(request.cookie ?? {}), [key]: compressed };
  }

  const requestBody = getRequestBodySchema(operation);
  if (requestBody) {
    request.body = compressSchema(requestBody, doc);
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
      });
    }
  }

  return endpoints;
};

export const minifySwaggerObject = (selectedEndpointIds: string[], doc: OpenApiDocument): MinifiedSwagger => {
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

    const request = buildRequest(pathItem.parameters, operation.parameters, operation, doc);
    if (request) {
      minifiedOp.request = request;
    }

    const responseSchema = getResponseSchema(pickPrimaryResponse(operation.responses));
    if (responseSchema) {
      minifiedOp.response = compressSchema(responseSchema, doc);
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
  doc: OpenApiDocument
): MinifiedOperation | undefined => {
  const parsed = parseEndpointId(id);
  if (!parsed) return undefined;

  const minified = minifySwaggerObject([id], doc);
  const pathItem = minified.paths[parsed.path];
  if (!pathItem) return undefined;

  return pathItem[parsed.method];
};

export const minifySwagger = (selectedEndpointIds: string[], doc: OpenApiDocument): string =>
  JSON.stringify(minifySwaggerObject(selectedEndpointIds, doc), null, 2);

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
