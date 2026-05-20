import { NextResponse } from 'next/server'
import { fetchMiamiDadeTaxDeedCases } from '@/lib/miami-dade-realtdm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { cases, count, detailsEnriched, totalListed } = await fetchMiamiDadeTaxDeedCases(100)
    return NextResponse.json({ cases, count, detailsEnriched, totalListed })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load RealTDM cases'
    return NextResponse.json({ error: message, cases: [] }, { status: 502 })
  }
}
