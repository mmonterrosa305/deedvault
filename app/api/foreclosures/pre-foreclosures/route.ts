import { NextResponse } from 'next/server'
import { fetchPreForeclosures } from '@/lib/pre-foreclosure'
import { fetchFloridaForeclosureAuctions } from '@/lib/realforeclose'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET() {
  try {
    const auctionResult = await fetchFloridaForeclosureAuctions()
    const result = await fetchPreForeclosures(auctionResult.listings)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pre-foreclosure fetch failed'
    return NextResponse.json({ error: message, listings: [] }, { status: 502 })
  }
}
