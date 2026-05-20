import type { MiamiDadeProperty } from '@/lib/miami-dade-api'
import { normalizeParcelNumber } from '@/lib/miami-dade-realtdm'
import type { MiamiDadeCase } from '@/lib/miami-dade-realtdm'

export type LiveDataRecord = {
  case: MiamiDadeCase
  property: MiamiDadeProperty | null
  /** Best display address: case address, else ArcGIS site address */
  displayAddress: string
  /** Best display owner from matched property */
  displayOwner: string | null
  assessedValue: number | null
}

export function buildPropertyIndex(properties: MiamiDadeProperty[]): Map<string, MiamiDadeProperty> {
  const index = new Map<string, MiamiDadeProperty>()
  for (const p of properties) {
    const key = normalizeParcelNumber(p.folio)
    if (key && !index.has(key)) index.set(key, p)
  }
  return index
}

/** Parse RealTDM sale date strings (e.g. "May 21, 2026"). */
export function parseSaleDate(saleDate: string): Date | null {
  const trimmed = saleDate.trim()
  if (!trimmed) return null
  const parsed = Date.parse(trimmed)
  if (Number.isNaN(parsed)) return null
  const d = new Date(parsed)
  d.setHours(0, 0, 0, 0)
  return d
}

/** True when sale date is today or later (local time). */
export function isUpcomingSale(saleDate: string): boolean {
  const sale = parseSaleDate(saleDate)
  if (!sale) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return sale.getTime() >= today.getTime()
}

export function mergeLiveData(
  cases: MiamiDadeCase[],
  properties: MiamiDadeProperty[]
): LiveDataRecord[] {
  const byParcel = buildPropertyIndex(properties)

  return cases.map(c => {
    const property = byParcel.get(c.parcelNormalized) ?? null
    const displayAddress =
      c.propertyAddress !== 'Address not available'
        ? c.propertyAddress
        : property?.siteAddress ?? c.propertyAddress
    return {
      case: c,
      property,
      displayAddress,
      displayOwner: property?.owner1 ?? null,
      assessedValue: property?.totalValue ?? null,
    }
  })
}
