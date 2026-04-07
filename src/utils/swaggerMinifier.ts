import type {
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

const toEndpointId = (method: HttpMethod, path: string): string => `${method.toUpperCase()} ${path}`;

export const parseEndpointId = (id: string): { method: HttpMethod; path: string } | null => {
  const [methodToken, ...pathTokens] = id.split(' ');
  if (!methodToken || pathTokens.length === 0) return null;

  const method = methodToken.toLowerCase() as HttpMethod;
  if (!HTTP_METHODS.includes(method)) return null;

  return { method, path: pathTokens.join(' ') };
};

const parameterToTs = (parameter: ParameterObject, doc: OpenApiDocument): string => {
  if (parameter.schema) return schemaToTs(parameter.schema, doc);
  if (parameter.type === 'array') return `${schemaToTs(parameter.items, doc)}[]`;

  switch (parameter.type) {
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'string':
      return 'string';
    default:
      return 'unknown';
  }
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

    const key = `${parameter.name}${parameter.required ? '' : '?'}`;
    const type = parameterToTs(parameter, doc);

    if (parameter.in === 'path') request.path = { ...(request.path ?? {}), [key]: type };
    if (parameter.in === 'query') request.query = { ...(request.query ?? {}), [key]: type };
    if (parameter.in === 'header') request.header = { ...(request.header ?? {}), [key]: type };
    if (parameter.in === 'cookie') request.cookie = { ...(request.cookie ?? {}), [key]: type };
  }

  const requestBody = getRequestBodySchema(operation);
  if (requestBody) {
    request.body = schemaToTs(requestBody, doc);
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

    const request = buildRequest(pathItem.parameters, operation.parameters, operation, doc);
    if (request) {
      minifiedOp.request = request;
    }

    const responseSchema = getResponseSchema(pickPrimaryResponse(operation.responses));
    if (responseSchema) {
      minifiedOp.response = schemaToTs(responseSchema, doc);
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

const toBase64 = (input: string): string => {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

export const fetchSwaggerFromUrl = async (
  url: string,
  username?: string,
  password?: string
): Promise<string> => {
  if (!url.trim()) {
    throw new Error('Swagger URL is required.');
  }

  const headers: HeadersInit = {
    Accept: 'application/json,text/plain,*/*',
  };

  if (username || password) {
    headers.Authorization = `Basic ${toBase64(`${username ?? ''}:${password ?? ''}`)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch swagger (${response.status} ${response.statusText}).`);
  }

  const raw = await response.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('URL did not return valid JSON.');
  }

  return JSON.stringify(parsed, null, 2);
};
