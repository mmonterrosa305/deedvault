import { NextResponse } from 'next/server'
import { realForecloseToAuctionListing } from '@/lib/foreclosure-feed'
import { fetchFloridaForeclosureAuctions } from '@/lib/realforeclose'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET() {
  try {
    const result = await fetchFloridaForeclosureAuctions()
    return NextResponse.json({
      listings: result.listings.map(realForecloseToAuctionListing),
      datesScanned: result.datesScanned,
      datesWithAuctions: result.datesWithAuctions,
      countyCounts: result.countyCounts,
      countiesScanned: result.countiesScanned,
      countiesWithListings: result.countiesWithListings,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Foreclosure auction fetch failed'
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
