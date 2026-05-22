import { NextResponse } from 'next/server'
import { cachedFetch } from '@/lib/server-cache'

export function requestWantsRefresh(request: Request): boolean {
  const v = new URL(request.url).searchParams.get('refresh')
  return v === '1' || v === 'true'
}

export type CacheMeta = {
  cachedAt: number
  fromCache: boolean
}

export function withRefreshParam(path: string, refresh: boolean): string {
  if (!refresh) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}refresh=1`
}

export async function withCachedApiResponse<T extends Record<string, unknown>>(
  request: Request,
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<NextResponse> {
  const refresh = requestWantsRefresh(request)
  const { data, cachedAt, fromCache } = await cachedFetch({
    key,
    ttlMs,
    refresh,
    fetcher,
  })
  return NextResponse.json({ ...data, cachedAt, fromCache })
}
