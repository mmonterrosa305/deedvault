import { NextResponse } from 'next/server'
import { fetchMichiganBid4AssetsListings } from '@/lib/bid4assets'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET() {
  try {
    const result = await fetchMichiganBid4AssetsListings()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bid4Assets fetch failed'
    return NextResponse.json(
      { error: message, listings: [], calendarCount: 0, searchCount: 0 },
      { status: 502 }
    )
  }
}
