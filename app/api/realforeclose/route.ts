import { NextResponse } from 'next/server'
import { fetchMiamiDadeRealForecloseListings } from '@/lib/realforeclose'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET() {
  console.log('[GET /api/realforeclose] handler invoked')
  try {
    const result = await fetchMiamiDadeRealForecloseListings()
    console.log(
      `[GET /api/realforeclose] returning ${result.listings.length} listings (${result.datesWithAuctions} auction days)`
    )
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'RealForeclose fetch failed'
    return NextResponse.json(
      { error: message, listings: [], datesScanned: 0, datesWithAuctions: 0 },
      { status: 502 }
    )
  }
}
