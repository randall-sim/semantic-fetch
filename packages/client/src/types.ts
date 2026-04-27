export interface ParameterDef {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default_value: string | null;
}

export interface ErrorShape {
  status: number;
  message: string;
  body: unknown;
}

export interface ResponseShape {
  status: number;
  shape: unknown;
}

export interface Parameters {
  path: ParameterDef[];
  query: ParameterDef[];
  headers: ParameterDef[];
  body: unknown;
}

export interface RouteMetadata {
  method: string;
  path: string;
  semantic: string;
  parameters: Parameters;
  response: ResponseShape;
  errors: ErrorShape[];
}

export interface QueryResponse {
  method: string;
  path: string;
  semantic: string;
  path_params: ParameterDef[];
  query_params: ParameterDef[];
  headers: ParameterDef[];
  body_shape: unknown;
  response_shape: unknown;
  errors: ErrorShape[];
  error: string | null;
}

export interface CallOptions {
  pathParams?: Record<string, string | number>;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface AgentOptions {
  headers?: Record<string, string>;
}

// Base shape for an entry in an AgentCallMap.
// Optional fields here keep the default (untyped) Agent permissive.
export type AgentCallEntry = {
  response: unknown;
  pathParams?: unknown;
  body?: unknown;
  headers?: unknown;
};

// Derives strongly-typed opts from a call map entry.
// Each field is typed from the entry if present, or falls back to a permissive default:
//   - headers: enforces the exact Headers interface (e.g. { Authorization: string })
//   - pathParams: enforces PathParams shape, or `never` if the route has none
//   - body: accepts Partial<Body> so callers can omit optional fields
export type TypedCallOptions<E extends AgentCallEntry> = {
  queryParams?: Record<string, string>;
  headers?: 'headers' extends keyof E
    ? E['headers'] extends object
      ? E['headers']
      : Record<string, string>
    : Record<string, string>;
  pathParams?: 'pathParams' extends keyof E ? E['pathParams'] : never;
  body?: 'body' extends keyof E
    ? E['body'] extends object
      ? Partial<E['body']>
      : E['body']
    : never;
};
