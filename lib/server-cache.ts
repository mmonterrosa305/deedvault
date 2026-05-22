/** In-memory server cache with TTL (persists for the life of the Node process). */

export const CACHE_TTL_MS = {
  realforeclose: 4 * 60 * 60 * 1000,
  govease: 4 * 60 * 60 * 1000,
  realtdm: 2 * 60 * 60 * 1000,
  michiganForeclosures: 4 * 60 * 60 * 1000,
} as const

type CacheEntry<T> = {
  data: T
  cachedAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string, ttlMs: number): { data: T; cachedAt: number } | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.cachedAt > ttlMs) {
    store.delete(key)
    return null
  }
  return { data: entry.data as T, cachedAt: entry.cachedAt }
}

export function setCached<T>(key: string, data: T): number {
  const cachedAt = Date.now()
  store.set(key, { data, cachedAt })
  return cachedAt
}

export function clearCache(key: string): void {
  store.delete(key)
}

export function clearCachePrefix(prefix: string): void {
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

export async function cachedFetch<T>(opts: {
  key: string
  ttlMs: number
  refresh?: boolean
  fetcher: () => Promise<T>
}): Promise<{ data: T; cachedAt: number; fromCache: boolean }> {
  if (opts.refresh) clearCache(opts.key)

  const hit = getCached<T>(opts.key, opts.ttlMs)
  if (hit) {
    return { data: hit.data, cachedAt: hit.cachedAt, fromCache: true }
  }

  const data = await opts.fetcher()
  const cachedAt = setCached(opts.key, data)
  return { data, cachedAt, fromCache: false }
}
