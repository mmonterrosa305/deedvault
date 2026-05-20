import { NextResponse } from 'next/server'
import { fetchFloridaTaxDeedCases } from '@/lib/realtdm'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET() {
  try {
    const { cases, count, detailsEnriched, totalListed, counties } =
      await fetchFloridaTaxDeedCases(100)
    return NextResponse.json({ cases, count, detailsEnriched, totalListed, counties })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load RealTDM cases'
    return NextResponse.json({ error: message, cases: [] }, { status: 502 })
  }
}
