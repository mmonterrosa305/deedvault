import { fetchFloridaRealForecloseListings } from '@/lib/realforeclose'
import { withCachedApiResponse } from '@/lib/cached-api'
import { CACHE_TTL_MS } from '@/lib/server-cache'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CACHE_KEY = 'realforeclose:all'

export async function GET(request: Request) {
  console.log('[GET /api/realforeclose] handler invoked')
  try {
    return await withCachedApiResponse(request, CACHE_KEY, CACHE_TTL_MS.realforeclose, async () => {
      const result = await fetchFloridaRealForecloseListings()
      console.log(
        `[GET /api/realforeclose] returning ${result.listings.length} listings across ${result.countiesWithListings}/${result.countiesScanned} counties`
      )
      return result
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'RealForeclose fetch failed'
    return Response.json(
      {
        error: message,
        listings: [],
        datesScanned: 0,
        datesWithAuctions: 0,
        countyCounts: [],
        countiesScanned: 0,
        countiesWithListings: 0,
        cachedAt: Date.now(),
        fromCache: false,
      },
      { status: 502 }
    )
  }
}
