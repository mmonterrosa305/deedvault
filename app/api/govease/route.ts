import { fetchFloridaGovEaseListings } from '@/lib/govease'
import { withCachedApiResponse } from '@/lib/cached-api'
import { CACHE_TTL_MS } from '@/lib/server-cache'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const CACHE_KEY = 'govease:florida'

export async function GET(request: Request) {
  try {
    return await withCachedApiResponse(request, CACHE_KEY, CACHE_TTL_MS.govease, () =>
      fetchFloridaGovEaseListings()
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GovEase fetch failed'
    return Response.json(
      {
        error: message,
        listings: [],
        sheetCount: 0,
        liveCount: 0,
        cachedAt: Date.now(),
        fromCache: false,
      },
      { status: 502 }
    )
  }
}
