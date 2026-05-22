/**
 * Wayne County Treasurer tax foreclosure auction (waynecountytreasurermi.com).
 * Public API discovered in site config.js — SearchItems returns all auction parcels.
 */

import { normalizeMichiganCountyKey } from '@/lib/michigan-counties'

export const WAYNE_AUCTION_HOME_URL = 'https://waynecountytreasurermi.com/'

const API_URL = 'https://waynecountytreasurermi.com/api'
const API_KEY = 'your-secret-api-key'

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Content-Type': 'application/json',
  'X-API-KEY': API_KEY,
}

export type WayneAuctionListing = {
  id: string
  county: string
  countyKey: string
  state: 'MI'
  address: string
  parcelId: string
  openingBid: number | null
  saleDate: string
  saleDateDisplay: string
  auctionItemId: string
  statusCode: string
  auctionUrl: string
}

type WayneSearchRow = {
  AI_ID?: number
  AI_ADDR?: string
  AI_CITY?: string
  ZIP_CD?: string
  AI_PARCEL_ID?: string
  AI_MIN_BID_AMT?: number
  AB_END_DT?: string
  EXTD_BIDDING_END_DT?: string | null
  STATUS_CD?: string
  ITEM_END_TIME?: number
  BATCH_END_TIME?: number
}

type WayneApiResponse = {
  bSuccess?: boolean
  sErrorInfo?: string
  oReturnObject?: string
}

function formatAddress(row: WayneSearchRow): string {
  const street = row.AI_ADDR?.trim() ?? ''
  const city = row.AI_CITY?.trim() ?? ''
  const zip = row.ZIP_CD?.trim() ?? ''
  if (street && city) return `${street}, ${city}, MI ${zip}`.replace(/, MI $/, ', MI')
  return street || city || 'Address not available'
}

function parseIsoDate(raw: string | undefined): string {
  if (!raw?.trim()) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toISOString().slice(0, 10)
}

function formatDisplayDate(raw: string | undefined): string {
  if (!raw?.trim()) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleString('en-US', {
    timeZone: 'America/Detroit',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Active/open lots have positive ITEM_END_TIME (ms remaining) per site batch logic. */
function isActiveWayneLot(row: WayneSearchRow): boolean {
  const end = row.ITEM_END_TIME ?? 0
  if (end > 0) return true
  const status = (row.STATUS_CD ?? '').toUpperCase()
  return status === 'OP' || status === 'ACTIVE' || status === 'OPEN'
}

function mapRow(row: WayneSearchRow): WayneAuctionListing {
  const auctionItemId = String(row.AI_ID ?? '').replace(/\.0$/, '')
  const endRaw = row.EXTD_BIDDING_END_DT ?? row.AB_END_DT
  return {
    id: `wayne-${auctionItemId}`,
    county: 'Wayne',
    countyKey: 'wayne',
    state: 'MI',
    address: formatAddress(row),
    parcelId: (row.AI_PARCEL_ID ?? '—').trim(),
    openingBid:
      row.AI_MIN_BID_AMT != null && Number.isFinite(row.AI_MIN_BID_AMT)
        ? row.AI_MIN_BID_AMT
        : null,
    saleDate: parseIsoDate(endRaw),
    saleDateDisplay: formatDisplayDate(endRaw),
    auctionItemId,
    statusCode: row.STATUS_CD ?? '—',
    auctionUrl: `${WAYNE_AUCTION_HOME_URL}search.html`,
  }
}

async function postSearchItems(body: Record<string, string>): Promise<WayneSearchRow[]> {
  const res = await fetch(`${API_URL}/General/SearchItems`, {
    method: 'POST',
    headers: FETCH_HEADERS,
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Wayne SearchItems failed (${res.status})`)
  const data = (await res.json()) as WayneApiResponse
  if (!data.bSuccess || !data.oReturnObject) {
    throw new Error(data.sErrorInfo || 'Wayne SearchItems returned no data')
  }
  return JSON.parse(data.oReturnObject) as WayneSearchRow[]
}

export async function fetchWayneCountyAuctionListings(options?: {
  activeOnly?: boolean
}): Promise<{
  listings: WayneAuctionListing[]
  totalInCatalog: number
  activeCount: number
}> {
  const activeOnly = options?.activeOnly !== false
  const rows = await postSearchItems({
    ParcelID: '',
    AuctionItemID: '',
    StreetNbr: '',
    StreetAddress: '',
    City: '',
    Zip: '',
  })

  const countyKey = normalizeMichiganCountyKey('Wayne') ?? 'wayne'
  let listings = rows.map(mapRow).filter(l => l.countyKey === countyKey)

  const active = listings.filter((_, i) => isActiveWayneLot(rows[i]))
  if (activeOnly) listings = active

  return {
    listings,
    totalInCatalog: rows.length,
    activeCount: active.length,
  }
}
