import { NextResponse } from 'next/server'
import { fetchMiamiDadeLisPendens } from '@/lib/lis-pendens'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET() {
  try {
    const result = await fetchMiamiDadeLisPendens()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LIS PENDENS fetch failed'
    return NextResponse.json({ error: message, listings: [] }, { status: 502 })
  }
}
