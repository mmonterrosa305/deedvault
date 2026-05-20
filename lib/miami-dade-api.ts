/**
 * Miami-Dade County open property data (ArcGIS REST).
 * Primary URL from Miami-Dade open data catalog; falls back if the service is unavailable.
 */

export const MIAMI_DADE_PROPERTY_QUERY_URL =
  'https://services.arcgis.com/8Pc9XBTAsYuxx9Ny/arcgis/rest/services/MD_PropertyBoundary/FeatureServer/0/query?where=1%3D1&outFields=FOLIO,SITEADDR,OWNER1,LND_VAL,BLDG_VAL,TOT_VAL,TAXYR&f=json&resultRecordCount=50'

/** County GIS fallback when MD_PropertyBoundary is unreachable */
const FALLBACK_QUERY_URL =
  'https://services5.arcgis.com/wI5GZmCtnUU8ueya/arcgis/rest/services/Miami_Dade_County_Parcel_Boundary/FeatureServer/0/query'

export const REALFORECLOSE_URL = 'https://miamidade.realforeclose.com'

export type MiamiDadeProperty = {
  folio: string
  siteAddress: string
  owner1: string
  landValue: number | null
  buildingValue: number | null
  totalValue: number | null
  taxYear: string | null
}

type ArcGISFeature = {
  attributes: Record<string, string | number | null | undefined>
}

type ArcGISResponse = {
  features?: ArcGISFeature[]
  error?: { message?: string; code?: number }
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function str(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function normalizeProperty(attrs: Record<string, string | number | null | undefined>): MiamiDadeProperty | null {
  const folio = str(attrs.FOLIO)
  if (!folio || folio === '0000000000000') return null

  const siteAddress =
    str(attrs.SITEADDR) ||
    str(attrs.TRUE_SITE_ADDR) ||
    str(attrs.TRUE_SITE_) ||
    str(attrs.ADDRESS)

  const owner1 =
    str(attrs.OWNER1) ||
    str(attrs.TRUE_OWNER1) ||
    str(attrs.TRUE_OWNER)

  const landValue = num(attrs.LND_VAL ?? attrs.LND_VAL_CUR)
  const buildingValue = num(attrs.BLDG_VAL ?? attrs.BLDG_VAL_CUR)
  const totalValue =
    num(attrs.TOT_VAL) ??
    num(attrs.ASSESSED_VAL_CUR) ??
    num(attrs.ASSESSED_V)

  const taxYear = str(attrs.TAXYR) || null

  if (!siteAddress && !owner1 && totalValue == null) return null

  return {
    folio,
    siteAddress: siteAddress || 'Address not available',
    owner1: owner1 || 'Owner not available',
    landValue,
    buildingValue,
    totalValue,
    taxYear,
  }
}

function parseArcGISResponse(data: ArcGISResponse): MiamiDadeProperty[] {
  if (data.error) {
    throw new Error(data.error.message ?? 'ArcGIS query failed')
  }
  const properties: MiamiDadeProperty[] = []
  const seen = new Set<string>()

  for (const feature of data.features ?? []) {
    const p = normalizeProperty(feature.attributes)
    if (!p || seen.has(p.folio)) continue
    seen.add(p.folio)
    properties.push(p)
  }

  return properties
}

async function queryArcGIS(url: string): Promise<MiamiDadeProperty[]> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`Miami-Dade API HTTP ${res.status}`)
  }

  const data = (await res.json()) as ArcGISResponse
  return parseArcGISResponse(data)
}

function buildFallbackUrl(limit = 50): string {
  const params = new URLSearchParams({
    where: 'ASSESSED_V > 0',
    outFields: 'FOLIO,TRUE_SITE_,TRUE_OWNER,ASSESSED_V',
    returnGeometry: 'false',
    f: 'json',
    resultRecordCount: String(limit),
  })
  return `${FALLBACK_QUERY_URL}?${params.toString()}`
}

/** Fetch Miami-Dade properties from the county open data API. */
export async function fetchMiamiDadeProperties(limit = 50): Promise<{
  properties: MiamiDadeProperty[]
  source: 'primary' | 'fallback'
}> {
  const primaryUrl = MIAMI_DADE_PROPERTY_QUERY_URL.replace(
    'resultRecordCount=50',
    `resultRecordCount=${limit}`
  )

  try {
    const properties = await queryArcGIS(primaryUrl)
    if (properties.length > 0) {
      return { properties, source: 'primary' }
    }
  } catch {
    // try ArcGIS capital path variant
    try {
      const altUrl = primaryUrl.replace('/arcgis/', '/ArcGIS/')
      const properties = await queryArcGIS(altUrl)
      if (properties.length > 0) {
        return { properties, source: 'primary' }
      }
    } catch {
      // fall through to fallback
    }
  }

  const properties = await queryArcGIS(buildFallbackUrl(limit))
  return { properties, source: 'fallback' }
}
