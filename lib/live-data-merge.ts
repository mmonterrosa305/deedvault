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
