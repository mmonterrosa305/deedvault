import { NextResponse } from 'next/server'
import { fetchFloridaRealForecloseListings } from '@/lib/realforeclose'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET() {
  console.log('[GET /api/realforeclose] handler invoked')
  try {
    const result = await fetchFloridaRealForecloseListings()
    console.log(
      `[GET /api/realforeclose] returning ${result.listings.length} listings across ${result.countiesWithListings}/${result.countiesScanned} counties`
    )
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'RealForeclose fetch failed'
    return NextResponse.json(
      {
        error: message,
        listings: [],
        datesScanned: 0,
        datesWithAuctions: 0,
        countyCounts: [],
        countiesScanned: 0,
        countiesWithListings: 0,
      },
      { status: 502 }
    )
  }
}
