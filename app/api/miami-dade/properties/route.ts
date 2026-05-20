import { NextResponse } from 'next/server'
import { fetchMiamiDadeProperties } from '@/lib/miami-dade-api'

export async function GET() {
  try {
    const { properties, source } = await fetchMiamiDadeProperties(50)
    return NextResponse.json({ properties, source, count: properties.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load Miami-Dade data'
    return NextResponse.json({ error: message, properties: [] }, { status: 502 })
  }
}
