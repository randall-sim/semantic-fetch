import type { AgentCallEntry, AgentOptions, CallOptions, QueryResponse, TypedCallOptions } from './types.js';

export class AgentError extends Error {
  constructor(
    message: string,
    public readonly route: QueryResponse | null,
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API responded with ${status}`);
    this.name = 'ApiError';
  }
}

// TMap maps each natural-language query string to its { response, pathParams?, body? } types.
// Defaults to a permissive map so Agent works untyped when no type argument is supplied.
export class Agent<TMap extends Record<string, AgentCallEntry> = Record<string, AgentCallEntry>> {
  private readonly backendUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly cache: Record<string, QueryResponse>;

  constructor(
    backendUrl: string,
    cache: Record<string, QueryResponse>,
    options: AgentOptions = {},
  ) {
    this.backendUrl = backendUrl.replace(/\/$/, '');
    this.defaultHeaders = options.headers ?? {};
    this.cache = cache;
  }

  async call<K extends string & keyof TMap>(
    query: K,
    opts?: TypedCallOptions<TMap[K]>,
  ): Promise<TMap[K]['response']> {
    const o = (opts ?? {}) as CallOptions;

    const routeMatch = this.cache[query];
    if (!routeMatch) {
      throw new AgentError(
        `No cached route for: "${query}". Run \`npx generate-types\` to update the cache.`,
        null,
      );
    }

    if (routeMatch.error) {
      throw new AgentError(routeMatch.error, routeMatch);
    }

    let urlPath = routeMatch.path;
    for (const [key, value] of Object.entries(o.pathParams ?? {})) {
      urlPath = urlPath.replace(`{${key}}`, encodeURIComponent(String(value)));
    }

    let url = `${this.backendUrl}${urlPath}`;
    if (o.queryParams && Object.keys(o.queryParams).length > 0) {
      url += `?${new URLSearchParams(o.queryParams)}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
      ...o.headers,
    };

    const init: RequestInit = { method: routeMatch.method, headers };
    if (o.body != null && ['POST', 'PUT', 'PATCH'].includes(routeMatch.method)) {
      init.body = JSON.stringify(o.body);
    }

    const res = await fetch(url, init);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(res.status, body);
    }

    if (res.status === 204) return null as TMap[K]['response'];
    return res.json() as Promise<TMap[K]['response']>;
  }
}
