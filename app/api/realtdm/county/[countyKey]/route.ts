import { NextResponse } from 'next/server'
import { fetchCountyTaxDeedCasesFull, getCountyByKey } from '@/lib/realtdm'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type RouteContext = { params: { countyKey: string } }

export async function GET(_request: Request, context: RouteContext) {
  const county = getCountyByKey(context.params.countyKey)
  if (!county) {
    return NextResponse.json({ error: 'Unknown county' }, { status: 404 })
  }

  try {
    const result = await fetchCountyTaxDeedCasesFull(county, 100)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'County fetch failed'
    return NextResponse.json(
      { error: message, county, cases: [], totalListed: 0, upcomingCount: 0, detailsEnriched: 0 },
      { status: 502 }
    )
  }
}
