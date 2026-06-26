import api from './api';

type CacheEntry = {
  data: unknown;
  expires: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 30_000;

function cacheKey(url: string, params?: Record<string, unknown>) {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join('&');
  return `${url}?${sorted}`;
}

export async function cachedGet<T>(
  url: string,
  options?: {
    params?: Record<string, unknown>;
    ttl?: number;
    force?: boolean;
  },
): Promise<T> {
  const key = cacheKey(url, options?.params);
  const ttl = options?.ttl ?? DEFAULT_TTL_MS;
  const now = Date.now();

  if (!options?.force) {
    const hit = cache.get(key);
    if (hit && hit.expires > now) {
      return hit.data as T;
    }

    const pending = inflight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }
  }

  const request = api
    .get(url, { params: options?.params })
    .then((response) => {
      cache.set(key, { data: response.data, expires: now + ttl });
      inflight.delete(key);
      return response.data as T;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, request);
  return request;
}

export function invalidateCachedGet(prefix?: string) {
  for (const key of cache.keys()) {
    if (!prefix || key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
