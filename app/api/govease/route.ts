import { NextResponse } from 'next/server'
import { fetchFloridaGovEaseListings } from '@/lib/govease'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET() {
  try {
    const result = await fetchFloridaGovEaseListings()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GovEase fetch failed'
    return NextResponse.json(
      { error: message, listings: [], sheetCount: 0, liveCount: 0 },
      { status: 502 }
    )
  }
}
