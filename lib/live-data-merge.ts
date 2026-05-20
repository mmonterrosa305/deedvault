import type { MiamiDadeProperty } from '@/lib/miami-dade-api'
import { isUpcomingSale, normalizeParcelNumber, type RealTdmCase } from '@/lib/realtdm'

export { isUpcomingSale } from '@/lib/realtdm'

export type LiveDataRecord = {
  case: RealTdmCase
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
  cases: RealTdmCase[],
  properties: MiamiDadeProperty[]
): LiveDataRecord[] {
  const byParcel = buildPropertyIndex(properties)

  return cases.map(c => {
    const property =
      c.countyKey === 'miamidade' ? (byParcel.get(c.parcelNormalized) ?? null) : null
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
