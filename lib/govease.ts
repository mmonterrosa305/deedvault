/**
 * GovEase upcoming tax sale listings — public schedule sheet + live auction parcels.
 * @see https://www.govease.com/auctions (Awesome Table → Google Sheets)
 */

import { isUpcomingSale } from '@/lib/realtdm'

export const GOVEASE_HOME_URL = 'https://www.govease.com'
export const GOVEASE_AUCTIONS_URL = 'https://www.govease.com/auctions'

const GOVEASE_SHEET_ID = '1Slyxj3HwCgnKv60z8DijQPzgUrIRH1xQNeUKjr5mnYs'
const GOVEASE_SHEET_TAB = 'Datatable'
const LIVE_AUCTIONS_ORIGIN = 'https://liveauctions.govease.com'

const FETCH_HEADERS = {
  'User-Agent': 'DeedVault/1.0 (GovEase connector)',
  Accept: 'application/json,text/html,*/*',
}

export const FL_GOVEASE_COUNTIES = [
  { key: 'orange', name: 'Orange', slug: 'florange' },
  { key: 'alachua', name: 'Alachua', slug: 'flalachua' },
  { key: 'hillsborough', name: 'Hillsborough', slug: 'flhillsborough' },
  { key: 'sarasota', name: 'Sarasota', slug: 'flsarasota' },
  { key: 'volusia', name: 'Volusia', slug: 'flvolusia' },
  { key: 'pinellas', name: 'Pinellas', slug: 'flpinellas' },
  { key: 'polk', name: 'Polk', slug: 'flpolk' },
  { key: 'lake', name: 'Lake', slug: 'fllake' },
  { key: 'marion', name: 'Marion', slug: 'flmarion' },
  { key: 'osceola', name: 'Osceola', slug: 'flosceola' },
] as const

export type GovEaseCounty = (typeof FL_GOVEASE_COUNTIES)[number]

export type GovEaseListing = {
  id: string
  county: string
  countyKey: string
  state: 'FL'
  address: string
  openingBid: number | null
  saleDate: string
  saleType: string | null
  parcelNumber: string | null
  source: 'sheet' | 'liveauction'
  auctionUrl: string | null
}

type GvizCell = { v?: unknown; f?: string } | null

type GvizResponse = {
  table?: {
    rows?: Array<{ c?: GvizCell[] }>
  }
}

const TAX_DEED_SALE_PATTERN =
  /tax\s*deed|redeemable\s*deed|deed\s*sale|sheriff|foreclosure/i

function normalizeCountyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+county$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function countyMatchesTarget(countyLabel: string, target: GovEaseCounty): boolean {
  const n = normalizeCountyName(countyLabel)
  const key = normalizeCountyName(target.name)
  return n === key || n.startsWith(key) || n.includes(key)
}

function parseMoney(value: string): number | null {
  const n = parseFloat(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

function parseGvizDateCell(cell: GvizCell): string {
  if (!cell) return ''
  if (cell.f) return cell.f.trim()
  const v = cell.v
  if (typeof v === 'string' && v.startsWith('Date(')) {
    const m = /Date\((\d+),(\d+),(\d+)/.exec(v)
    if (m) {
      const year = Number(m[1])
      const month = Number(m[2]) + 1
      const day = Number(m[3])
      return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`
    }
  }
  return v != null ? String(v).trim() : ''
}

function parseGvizJsonp(raw: string): GvizResponse {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Invalid GovEase sheet response')
  return JSON.parse(raw.slice(start, end + 1)) as GvizResponse
}

function isTaxDeedSaleType(saleType: string): boolean {
  if (!saleType.trim()) return true
  return TAX_DEED_SALE_PATTERN.test(saleType)
}

async function fetchScheduleRows(): Promise<GvizResponse['table']> {
  const url = new URL(
    `https://docs.google.com/spreadsheets/d/${GOVEASE_SHEET_ID}/gviz/tq`
  )
  url.searchParams.set('tqx', 'out:json')
  url.searchParams.set('sheet', GOVEASE_SHEET_TAB)
  url.searchParams.set('headers', '2')
  url.searchParams.set('range', 'A1:U')

  const res = await fetch(url.toString(), {
    headers: FETCH_HEADERS,
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`GovEase sheet fetch failed (${res.status})`)
  const text = await res.text()
  return parseGvizJsonp(text).table
}

function listingsFromSheet(table: GvizResponse['table']): GovEaseListing[] {
  const rows = table?.rows ?? []
  const out: GovEaseListing[] = []

  for (const row of rows) {
    const cells = row.c ?? []
    const countyLabel = String(cells[2]?.v ?? '').trim()
    const state = String(cells[3]?.v ?? '').trim().toUpperCase()
    if (state !== 'FL') continue

    const county = FL_GOVEASE_COUNTIES.find(c => countyMatchesTarget(countyLabel, c))
    if (!county) continue

    const saleType = String(cells[9]?.v ?? '').trim()
    if (!isTaxDeedSaleType(saleType)) continue

    const saleDate = parseGvizDateCell(cells[7] ?? null)
    if (!saleDate || !isUpcomingSale(saleDate)) continue

    const street = String(cells[12]?.v ?? '').trim()
    const city = String(cells[13]?.v ?? '').trim()
    const fullAddress = String(cells[14]?.v ?? '').trim()
    const address = fullAddress || [street, city].filter(Boolean).join(', ') || `${county.name} County, FL`

    const auctionUrl = String(cells[17]?.v ?? '').trim() || null

    out.push({
      id: `govease-sheet-${county.key}-${saleDate.replace(/\//g, '-')}`,
      county: county.name,
      countyKey: county.key,
      state: 'FL',
      address,
      openingBid: null,
      saleDate,
      saleType: saleType || null,
      parcelNumber: null,
      source: 'sheet',
      auctionUrl,
    })
  }

  return out
}

async function resolveCountyId(slug: string): Promise<number> {
  const res = await fetch(`${LIVE_AUCTIONS_ORIGIN}/fl/${slug}/1200/browsebiddown`, {
    headers: FETCH_HEADERS,
    next: { revalidate: 3600 },
  })
  const html = await res.text()
  const fromCriteria = html.match(/"CountyID":(\d+),"CountySlug":"${slug}"/)?.[1]
  if (fromCriteria) return Number(fromCriteria)
  const fromInput = html.match(/id="CountyID"\s+value="(\d+)"/)?.[1]
  if (fromInput) return Number(fromInput)
  return 1200
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseAuctionGridHtml(grid: string, county: GovEaseCounty, countyId: number): GovEaseListing[] {
  const rowRe =
    /<tr role="row" class="(?:odd|even) nobid"[^>]*>([\s\S]*?)<\/tr>/gi
  const listings: GovEaseListing[] = []
  let match: RegExpExecArray | null

  while ((match = rowRe.exec(grid)) !== null) {
    const rowHtml = match[1]
    const tds = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1])
    const parcel = stripHtml(tds[3] ?? '')
    const owner = stripHtml(tds[4] ?? '')
    const faceValue = rowHtml.match(/class="alignDollar">\s*([^<]+)\s*</i)?.[1]?.trim()
    const hiddenTds = [...rowHtml.matchAll(/<td style="display: none;"[^>]*>([\s\S]*?)<\/td>/gi)]
    const parcelAddress = stripHtml(hiddenTds[0]?.[1] ?? '')
    const auctionName = stripHtml(hiddenTds[1]?.[1] ?? '')

    const parcelNumber = parcel && parcel !== '&nbsp;' ? parcel : null
    if (!parcelNumber && !owner) continue

    const openingBid = faceValue ? parseMoney(faceValue) : null
    const address =
      parcelAddress ||
      (owner ? `${owner}${parcelNumber ? ` · ${parcelNumber}` : ''}` : parcelNumber) ||
      `${county.name} County parcel`

    const linkMatch = rowHtml.match(/href="([^"]+)"/)?.[1]
    const auctionUrl = linkMatch
      ? linkMatch.startsWith('http')
        ? linkMatch
        : `${LIVE_AUCTIONS_ORIGIN}${linkMatch}`
      : `${LIVE_AUCTIONS_ORIGIN}/fl/${county.slug}/${countyId}/browsebiddown`

    const idSuffix = linkMatch?.split('/').pop() ?? parcelNumber ?? String(listings.length)

    listings.push({
      id: `govease-live-${county.key}-${idSuffix}`,
      county: county.name,
      countyKey: county.key,
      state: 'FL',
      address,
      openingBid,
      saleDate: '—',
      saleType: auctionName || null,
      parcelNumber,
      source: 'liveauction',
      auctionUrl,
    })
  }

  return listings
}

async function fetchCountyLiveParcels(county: GovEaseCounty): Promise<GovEaseListing[]> {
  const countyId = await resolveCountyId(county.slug)
  const postUrl = `/fl/${county.slug}/${countyId}/browsebiddown`

  const res = await fetch(`${LIVE_AUCTIONS_ORIGIN}/OpenAuction/RefreshBidDownAuctions`, {
    method: 'POST',
    headers: {
      ...FETCH_HEADERS,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({
      countyId,
      criteria: {
        PostUrl: postUrl,
        ResetUrl: postUrl,
        StateAbbr: 'fl',
        CountySlug: county.slug,
        CountyID: countyId,
        ParcelNumber: '',
        CountyIdList: [],
        Location: '',
        OwnerName: '',
        FaceValueFrom: null,
        FaceValueTo: null,
        WatchList: false,
        AuctionLienFilter: null,
        MultiSearchBox: null,
      },
      pageNumber: 1,
      pageSize: 500,
      orderBy: '',
      orderDesc: 1,
      stateAbbr: 'fl',
    }),
    next: { revalidate: 120 },
  })

  if (!res.ok) return []
  const data = (await res.json()) as { Result?: boolean; Grid?: string }
  if (!data.Result || !data.Grid) return []
  return parseAuctionGridHtml(data.Grid, county, countyId)
}

/** Merge sheet schedule rows with live parcel rows; prefer live parcels when both exist. */
export function mergeGovEaseListings(
  sheet: GovEaseListing[],
  live: GovEaseListing[]
): GovEaseListing[] {
  const sheetByCounty = new Map(sheet.map(s => [s.countyKey, s]))
  const enrichedLive = live.map(row => {
    if (row.saleDate !== '—') return row
    const sched = sheetByCounty.get(row.countyKey)
    if (!sched) return row
    return { ...row, saleDate: sched.saleDate, saleType: row.saleType ?? sched.saleType }
  })
  const liveCounties = new Set(enrichedLive.map(l => l.countyKey))
  const sheetOnly = sheet.filter(s => !liveCounties.has(s.countyKey))
  return [...enrichedLive, ...sheetOnly]
}

export async function fetchFloridaGovEaseListings(): Promise<{
  listings: GovEaseListing[]
  sheetCount: number
  liveCount: number
}> {
  const table = await fetchScheduleRows()
  const sheet = listingsFromSheet(table)

  const liveResults = await Promise.all(
    FL_GOVEASE_COUNTIES.map(async county => {
      try {
        return await fetchCountyLiveParcels(county)
      } catch {
        return [] as GovEaseListing[]
      }
    })
  )
  const live = liveResults.flat()

  const listings = mergeGovEaseListings(sheet, live)
  listings.sort((a, b) => {
    if (a.saleDate === '—' && b.saleDate !== '—') return 1
    if (b.saleDate === '—' && a.saleDate !== '—') return -1
    const da = Date.parse(a.saleDate)
    const db = Date.parse(b.saleDate)
    if (!Number.isNaN(da) && !Number.isNaN(db) && da !== db) return da - db
    return a.county.localeCompare(b.county)
  })

  return { listings, sheetCount: sheet.length, liveCount: live.length }
}
