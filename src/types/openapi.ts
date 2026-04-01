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
  enum?: Array<string | number | boolean | null>;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
  additionalProperties?: boolean | SchemaObject;
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  allOf?: SchemaObject[];
  $ref?: string;
}

export interface ParameterObject {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie' | 'body' | 'formData';
  required?: boolean;
  schema?: SchemaObject;
  type?: string;
  items?: SchemaObject;
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

export interface MinifiedRequest {
  path?: Record<string, string>;
  query?: Record<string, string>;
  header?: Record<string, string>;
  cookie?: Record<string, string>;
  body?: string;
}

export interface MinifiedOperation {
  summary?: string;
  description?: string;
  request?: MinifiedRequest;
  response?: string;
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

export interface SwaggerMinifierProps {
  initialJson?: string;
  className?: string;
}
