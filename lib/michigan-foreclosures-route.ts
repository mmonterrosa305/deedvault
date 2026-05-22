import { fetchMichiganForeclosureListings } from '@/lib/michigan-foreclosures'
import { withCachedApiResponse } from '@/lib/cached-api'
import { CACHE_TTL_MS } from '@/lib/server-cache'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const CACHE_KEY = 'michigan-foreclosures'

export async function GET(request: Request) {
  try {
    return await withCachedApiResponse(
      request,
      CACHE_KEY,
      CACHE_TTL_MS.michiganForeclosures,
      () => fetchMichiganForeclosureListings()
    )
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Michigan foreclosures fetch failed'
    return Response.json(
      {
        error: message,
        listings: [],
        sourceCounts: {
          bid4assets: 0,
          sri: 0,
          wayne: 0,
          taxSaleInfo: 0,
          total: 0,
        },
        warnings: [message],
        wayneCatalogTotal: 0,
        taxSaleAuctionGroups: [],
        cachedAt: Date.now(),
        fromCache: false,
      },
      { status: 502 }
    )
  }
}
