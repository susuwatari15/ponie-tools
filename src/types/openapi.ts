export type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'options'
  | 'head'
  | 'trace';

export interface SchemaObject {
  type?: string;
  format?: string;
  nullable?: boolean;
  description?: string;
  enum?: Array<string | number | boolean | null>;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
  additionalProperties?: boolean | SchemaObject;
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  allOf?: SchemaObject[];
  $ref?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean | number;
  exclusiveMaximum?: boolean | number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  pattern?: string;
  default?: unknown;
  example?: unknown;
}

export interface ParameterObject {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie' | 'body' | 'formData';
  required?: boolean;
  description?: string;
  schema?: SchemaObject;
  type?: string;
  items?: SchemaObject;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  enum?: Array<string | number | boolean | null>;
}

export interface MediaTypeObject {
  schema?: SchemaObject;
}

export interface ResponseObject {
  schema?: SchemaObject;
  content?: Record<string, MediaTypeObject>;
}

export interface RequestBodyObject {
  required?: boolean;
  content?: Record<string, MediaTypeObject>;
}

export interface OperationObject {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses?: Record<string, ResponseObject>;
}

export interface PathItemObject {
  parameters?: ParameterObject[];
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  patch?: OperationObject;
  delete?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  trace?: OperationObject;
}

export interface OpenApiDocument {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    version?: string;
  };
  paths?: Record<string, PathItemObject>;
  components?: {
    schemas?: Record<string, SchemaObject>;
  };
  definitions?: Record<string, SchemaObject>;
}

export interface EndpointItem {
  id: string;
  path: string;
  method: HttpMethod;
  summary: string;
}

export interface CompressedSchema {
  type?: string;
  format?: string;
  description?: string;
  required?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  enum?: Array<string | number | boolean | null>;
  items?: CompressedSchema;
  properties?: Record<string, CompressedSchema>;
  additionalProperties?: boolean | CompressedSchema;
  $ref?: string;
  example?: unknown;
}

export interface MinifiedRequest {
  path?: Record<string, CompressedSchema>;
  query?: Record<string, CompressedSchema>;
  header?: Record<string, CompressedSchema>;
  cookie?: Record<string, CompressedSchema>;
  body?: CompressedSchema;
}

export interface MinifiedOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  request?: MinifiedRequest;
  response?: CompressedSchema;
}

export interface MinifiedPathItem {
  get?: MinifiedOperation;
  post?: MinifiedOperation;
  put?: MinifiedOperation;
  patch?: MinifiedOperation;
  delete?: MinifiedOperation;
  options?: MinifiedOperation;
  head?: MinifiedOperation;
  trace?: MinifiedOperation;
}

export interface MinifiedSwagger {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, MinifiedPathItem>;
}
