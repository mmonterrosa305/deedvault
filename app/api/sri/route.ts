import { NextResponse } from 'next/server'
import { fetchMichiganSriListings } from '@/lib/sri'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET() {
  try {
    const result = await fetchMichiganSriListings()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SRI fetch failed'
    return NextResponse.json(
      { error: message, listings: [], countyCount: 0 },
      { status: 502 }
    )
  }
}
