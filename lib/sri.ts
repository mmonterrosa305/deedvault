/**
 * SRI (Strategic Realty Inc) Michigan tax sale listings.
 * Public property search API used by Sale Information on sriservices.com / sri-taxsale.com.
 * @see https://www.sriservices.com/Home/SaleSearch
 */

import { isUpcomingSale } from '@/lib/realtdm'

export const SRI_HOME_URL = 'https://www.sri-taxsale.com'
export const SRI_SALE_SEARCH_URL = 'https://www.sriservices.com/Home/SaleSearch'

const SRI_API_ORIGIN = 'https://sriservicesusermgmtprod.azurewebsites.net'
const SRI_CARDDETAIL_URL = `${SRI_API_ORIGIN}/api/property/carddetail`

/** Public x-api-key from the SRI Services web client (override via SRI_X_API_KEY). */
const DEFAULT_SRI_X_API_KEY =
  '9f8fd9fe5160294175e1c737567030f495d838a7922a678bc06e0a093910'

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

export const MI_SRI_COUNTIES = [
  { key: 'oakland', name: 'Oakland' },
  { key: 'macomb', name: 'Macomb' },
  { key: 'ingham', name: 'Ingham' },
  { key: 'genesee', name: 'Genesee' },
  { key: 'kalamazoo', name: 'Kalamazoo' },
  { key: 'saginaw', name: 'Saginaw' },
  { key: 'muskegon', name: 'Muskegon' },
  { key: 'bay', name: 'Bay' },
  { key: 'calhoun', name: 'Calhoun' },
  { key: 'jackson', name: 'Jackson' },
] as const

export type SriCounty = (typeof MI_SRI_COUNTIES)[number]

export type SriListing = {
  id: string
  county: string
  countyKey: string
  state: 'MI'
  address: string
  openingBid: number | null
  saleDate: string
  parcelNumber: string | null
  saleType: string | null
  saleStatus: string | null
  auctionUrl: string
}

export type SriCountySummary = {
  countyKey: string
  county: string
  rawCount: number
  upcomingCount: number
}

type SriCardProperty = {
  id?: number
  propertyId?: string
  altPropertyId?: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  zip?: string
  county?: string
  auctionDate?: string
  date?: string
  time?: string
  saleId?: number
  saleType?: string
  saleTypeDescription?: string
  saleStatusDescription?: string
  minimumBid?: number | string | null
  openingBid?: number | string | null
}

type SriCardDetailResponse = {
  properties?: SriCardProperty[]
}

function sriApiKey(): string {
  return process.env.SRI_X_API_KEY?.trim() || DEFAULT_SRI_X_API_KEY
}

function parseMoney(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

/** SRI returns MM/DD/YYYY; normalize to ISO for sorting and date filters. */
function normalizeSaleDate(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return '—'
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const [, mo, da, yr] = slash
    return `${yr}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`
  }
  return trimmed
}

function formatAddress(row: SriCardProperty): string {
  const line1 = row.address1?.trim()
  const line2 = row.address2?.trim()
  const city = row.city?.trim()
  const zip = row.zip?.trim()
  const street = [line1, line2].filter(Boolean).join(' ')
  const locality = [city, zip ? `MI ${zip}` : 'MI'].filter(Boolean).join(', ')
  if (street && locality) return `${street}, ${locality}`
  if (street) return street
  if (locality) return locality
  const pid = row.propertyId?.trim() || row.altPropertyId?.trim()
  return pid ? `Parcel ${pid}` : 'Property (address not listed)'
}

function listingId(countyKey: string, row: SriCardProperty): string {
  const pid = row.propertyId ?? row.altPropertyId ?? String(row.id ?? '')
  const saleId = row.saleId ?? row.id ?? ''
  return `sri-${countyKey}-${pid}-${saleId}`
}

function propertyAuctionUrl(row: SriCardProperty): string {
  if (row.saleId) {
    return `${SRI_SALE_SEARCH_URL}?saleId=${row.saleId}`
  }
  const parcel = row.propertyId?.trim() || row.altPropertyId?.trim()
  if (parcel) {
    return `${SRI_SALE_SEARCH_URL}?propertyId=${encodeURIComponent(parcel)}`
  }
  return SRI_SALE_SEARCH_URL
}

/** Delinquent post-sale inventory — not an upcoming auction. */
function isDelinquentInventory(row: SriCardProperty): boolean {
  return /DELINQUENT/i.test(row.saleStatusDescription ?? '')
}

function isUpcomingSriListing(row: SriCardProperty, saleDate: string): boolean {
  if (isDelinquentInventory(row)) return false
  if (saleDate === '—') return false
  return isUpcomingSale(saleDate)
}

function mapProperty(county: SriCounty, row: SriCardProperty): SriListing {
  const saleDate = normalizeSaleDate(row.auctionDate ?? row.date)
  const openingBid =
    parseMoney(row.minimumBid) ??
    parseMoney(row.openingBid)

  return {
    id: listingId(county.key, row),
    county: county.name,
    countyKey: county.key,
    state: 'MI',
    address: formatAddress(row),
    openingBid,
    saleDate,
    parcelNumber: row.propertyId?.trim() || row.altPropertyId?.trim() || null,
    saleType: row.saleTypeDescription?.trim() || row.saleType?.trim() || null,
    saleStatus: row.saleStatusDescription?.trim() || null,
    auctionUrl: propertyAuctionUrl(row),
  }
}

async function postCardDetail(county: SriCounty): Promise<SriCardProperty[]> {
  const body = {
    /** Empty string returns all records; object date filters return 0 from this API. */
    auctionDateRange: '',
    auctionStyle: '',
    county: county.name,
    propertySaleType: '',
    recordCount: 50000,
    saleStatus: '',
    searchText: '',
    startIndex: 0,
    state: 'MI',
  }

  const res = await fetch(SRI_CARDDETAIL_URL, {
    method: 'POST',
    headers: {
      ...FETCH_HEADERS,
      'x-api-key': sriApiKey(),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`SRI carddetail failed for ${county.name} (${res.status})`)
  }

  const data = (await res.json()) as SriCardDetailResponse
  return data.properties ?? []
}

async function fetchCountyListings(
  county: SriCounty
): Promise<{ listings: SriListing[]; rawCount: number }> {
  const rows = await postCardDetail(county)
  const listings: SriListing[] = []

  for (const row of rows) {
    const listing = mapProperty(county, row)
    if (isUpcomingSriListing(row, listing.saleDate)) {
      listings.push(listing)
    }
  }

  return { listings, rawCount: rows.length }
}

export async function fetchMichiganSriListings(): Promise<{
  listings: SriListing[]
  countyCount: number
  countySummaries: SriCountySummary[]
  rawTotal: number
}> {
  const summaries: SriCountySummary[] = []
  const byId = new Map<string, SriListing>()
  let rawTotal = 0

  const results = await Promise.all(
    MI_SRI_COUNTIES.map(async county => {
      try {
        return { county, ...(await fetchCountyListings(county)), err: false as const }
      } catch {
        return {
          county,
          listings: [] as SriListing[],
          rawCount: 0,
          err: true as const,
        }
      }
    })
  )

  for (const { county, listings, rawCount } of results) {
    rawTotal += rawCount
    summaries.push({
      countyKey: county.key,
      county: county.name,
      rawCount,
      upcomingCount: listings.length,
    })
    for (const row of listings) {
      byId.set(row.id, row)
    }
  }

  const merged = [...byId.values()].sort((a, b) => {
    const da = Date.parse(a.saleDate)
    const db = Date.parse(b.saleDate)
    if (!Number.isNaN(da) && !Number.isNaN(db) && da !== db) return da - db
    if (a.saleDate === '—' && b.saleDate !== '—') return 1
    if (b.saleDate === '—' && a.saleDate !== '—') return -1
    return a.county.localeCompare(b.county)
  })

  return {
    listings: merged,
    countyCount: MI_SRI_COUNTIES.length,
    countySummaries: summaries.sort((a, b) => b.upcomingCount - a.upcomingCount || a.county.localeCompare(b.county)),
    rawTotal,
  }
}
