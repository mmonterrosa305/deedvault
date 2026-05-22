import { fetchCountyTaxDeedCasesFull, getCountyByKey } from '@/lib/realtdm'
import { withCachedApiResponse } from '@/lib/cached-api'
import { CACHE_TTL_MS } from '@/lib/server-cache'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type RouteContext = { params: { countyKey: string } }

export async function GET(request: Request, context: RouteContext) {
  const county = getCountyByKey(context.params.countyKey)
  if (!county) {
    return Response.json({ error: 'Unknown county' }, { status: 404 })
  }

  const cacheKey = `realtdm:${county.key}`

  try {
    return await withCachedApiResponse(request, cacheKey, CACHE_TTL_MS.realtdm, () =>
      fetchCountyTaxDeedCasesFull(county, 100)
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'County fetch failed'
    return Response.json(
      {
        error: message,
        county,
        cases: [],
        totalListed: 0,
        upcomingCount: 0,
        detailsEnriched: 0,
        cachedAt: Date.now(),
        fromCache: false,
      },
      { status: 502 }
    )
  }
}
