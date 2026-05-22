import { realForecloseToAuctionListing } from '@/lib/foreclosure-feed'
import { fetchFloridaForeclosureAuctions } from '@/lib/realforeclose'
import { withCachedApiResponse } from '@/lib/cached-api'
import { CACHE_TTL_MS } from '@/lib/server-cache'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CACHE_KEY = 'realforeclose:foreclosure'

export async function GET(request: Request) {
  try {
    return await withCachedApiResponse(request, CACHE_KEY, CACHE_TTL_MS.realforeclose, async () => {
      const result = await fetchFloridaForeclosureAuctions()
      return {
        listings: result.listings.map(realForecloseToAuctionListing),
        datesScanned: result.datesScanned,
        datesWithAuctions: result.datesWithAuctions,
        countyCounts: result.countyCounts,
        countiesScanned: result.countiesScanned,
        countiesWithListings: result.countiesWithListings,
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Foreclosure auction fetch failed'
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
