/**
 * SRI (Strategic Realty Inc) Michigan tax sale listings.
 * Public property search API used by Sale Information on sriservices.com / sri-taxsale.com.
 * @see https://www.sri-taxsale.com
 */

import { isUpcomingSale } from '@/lib/realtdm'

export const SRI_HOME_URL = 'https://www.sri-taxsale.com'

const SRI_API_ORIGIN = 'https://sriservicesusermgmtprod.azurewebsites.net'
const SRI_CARDDETAIL_URL = `${SRI_API_ORIGIN}/api/property/carddetail`

/** Public x-api-key from the SRI Services web client (override via SRI_X_API_KEY). */
const DEFAULT_SRI_X_API_KEY =
  '9f8fd9fe5160294175e1c737567030f495d838a7922a678bc06e0a093910'

const FETCH_HEADERS = {
  'User-Agent': 'DeedVault/1.0 (SRI connector)',
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

type SriDateRange =
  | number
  | {
      startDate: string
      endDate: string
      compareOperator: string
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

function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function upcomingDateRange(): SriDateRange {
  return {
    startDate: todayIsoDate(),
    endDate: '',
    compareOperator: '>',
  }
}

function parseMoney(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

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
    auctionUrl: SRI_HOME_URL,
  }
}

async function postCardDetail(
  county: SriCounty,
  auctionDateRange: SriDateRange
): Promise<SriCardProperty[]> {
  const body = {
    auctionDateRange,
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
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    throw new Error(`SRI carddetail failed for ${county.name} (${res.status})`)
  }

  const data = (await res.json()) as SriCardDetailResponse
  return data.properties ?? []
}

async function fetchCountyListings(county: SriCounty): Promise<SriListing[]> {
  const rows = await postCardDetail(county, upcomingDateRange())

  return rows
    .map(row => mapProperty(county, row))
    .filter(
      listing => listing.saleDate === '—' || isUpcomingSale(listing.saleDate)
    )
}

export async function fetchMichiganSriListings(): Promise<{
  listings: SriListing[]
  countyCount: number
}> {
  const results = await Promise.all(
    MI_SRI_COUNTIES.map(async county => {
      try {
        return await fetchCountyListings(county)
      } catch {
        return [] as SriListing[]
      }
    })
  )

  const byId = new Map<string, SriListing>()
  for (const row of results.flat()) {
    byId.set(row.id, row)
  }

  const listings = [...byId.values()].sort((a, b) => {
    const da = Date.parse(a.saleDate)
    const db = Date.parse(b.saleDate)
    if (!Number.isNaN(da) && !Number.isNaN(db) && da !== db) return da - db
    if (a.saleDate === '—' && b.saleDate !== '—') return 1
    if (b.saleDate === '—' && a.saleDate !== '—') return -1
    return a.county.localeCompare(b.county)
  })

  return { listings, countyCount: MI_SRI_COUNTIES.length }
}
