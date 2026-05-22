import { NextResponse } from 'next/server'
import { fetchMichiganForeclosureListings } from '@/lib/michigan-foreclosures'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

export async function GET() {
  try {
    const result = await fetchMichiganForeclosureListings()
    return NextResponse.json(result)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Michigan foreclosures fetch failed'
    return NextResponse.json(
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
      },
      { status: 502 }
    )
  }
}
