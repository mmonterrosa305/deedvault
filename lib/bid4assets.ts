/**
 * Bid4Assets Michigan tax sale listings.
 * Calendar: https://www.bid4assets.com/taxsale
 * Search API: https://www.bid4assets.com/api/search/process
 */

import { isUpcomingSale } from '@/lib/realtdm'

export const BID4ASSETS_HOME_URL = 'https://www.bid4assets.com'
export const BID4ASSETS_TAXSALE_URL = 'https://www.bid4assets.com/taxsale'

const ORIGIN = 'https://www.bid4assets.com'
const SEARCH_PAGE_URL = `${ORIGIN}/v5/search`
const SEARCH_API_URL = `${ORIGIN}/api/search/process`

const FETCH_HEADERS = {
  'User-Agent': 'DeedVault/1.0 (Bid4Assets connector)',
  Accept: 'text/html,application/json,*/*',
}

export const MI_BID4ASSETS_COUNTIES = [
  { key: 'wayne', name: 'Wayne' },
  { key: 'washtenaw', name: 'Washtenaw' },
  { key: 'oakland', name: 'Oakland' },
  { key: 'macomb', name: 'Macomb' },
  { key: 'kent', name: 'Kent' },
  { key: 'genesee', name: 'Genesee' },
  { key: 'ingham', name: 'Ingham' },
  { key: 'kalamazoo', name: 'Kalamazoo' },
  { key: 'muskegon', name: 'Muskegon' },
  { key: 'saginaw', name: 'Saginaw' },
] as const

export type Bid4AssetsCounty = (typeof MI_BID4ASSETS_COUNTIES)[number]

export type Bid4AssetsListing = {
  id: string
  county: string
  countyKey: string
  state: 'MI'
  address: string
  openingBid: number | null
  saleDate: string
  auctionTitle: string | null
  source: 'calendar' | 'search'
  auctionUrl: string | null
  auctionId: number | null
}

type SearchApiRow = {
  auctionId?: number
  assetTitle?: string
  highBidAmount?: number | null
  currentBid?: number | null
  currentBidString?: string | null
  bidCloseTime?: string | null
  bidOpenTime?: string | null
  linkUrl?: string | null
  locatedCity?: string | null
  locatedState?: string | null
}

type SearchApiResponse = {
  data?: SearchApiRow[]
  total?: number
  errors?: unknown
}

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function matchesMichiganCounty(title: string, county: Bid4AssetsCounty): boolean {
  const t = title.toLowerCase()
  const name = county.name.toLowerCase()
  if (!t.includes(name)) return false
  return (
    t.includes('michigan') ||
    t.includes(', mi') ||
    t.includes(' mi ') ||
    t.includes(`${name} county`)
  )
}

function parseMoney(value: string | null | undefined): number | null {
  if (!value) return null
  const n = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function formatIsoDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const month = d.getMonth() + 1
  const day = d.getDate()
  const year = d.getFullYear()
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`
}

function parseCalendarDateSpan(span: string, year: number): string | null {
  const m = span.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?/i
  )
  if (m) {
    const month = MONTHS[m[1].toLowerCase()]
    const day = Number(m[2])
    if (month && day) {
      return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`
    }
  }
  const m2 = span.match(/(\d{1,2})(?:st|nd|rd|th)?\s*-\s*(\d{1,2})(?:st|nd|rd|th)?/i)
  if (m2) {
    const now = new Date()
    const month = now.getMonth() + 1
    const day = Number(m2[1])
    const y = year || now.getFullYear()
    return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${y}`
  }
  return null
}

async function fetchCsrfToken(): Promise<string | null> {
  const res = await fetch(SEARCH_PAGE_URL, {
    headers: FETCH_HEADERS,
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  const html = await res.text()
  const match = html.match(
    /name="__RequestVerificationToken"[^>]*value="([^"]+)"/i
  )
  return match?.[1] ?? null
}

function parseTaxsaleCalendar(html: string): Bid4AssetsListing[] {
  const listings: Bid4AssetsListing[] = []
  const monthBlocks = html.split(/<div class="month"[^>]*data-year="(\d+)"[^>]*>/gi)

  for (let i = 1; i < monthBlocks.length; i++) {
    const yearMatch = monthBlocks[i].match(/^(\d+)/)
    const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear()
    const block = monthBlocks[i]

    const itemRe =
      /<li>\s*<a href="([^"]+)">([\s\S]*?)<\/a>\s*<span>([\s\S]*?)<\/span>\s*<\/li>/gi
    let match: RegExpExecArray | null
    while ((match = itemRe.exec(block)) !== null) {
      const href = match[1].trim()
      const title = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      const dateSpan = match[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      if (!title) continue

      const county = MI_BID4ASSETS_COUNTIES.find(c => matchesMichiganCounty(title, c))
      if (!county) continue

      const saleDate = parseCalendarDateSpan(dateSpan, year)
      if (!saleDate || !isUpcomingSale(saleDate)) continue

      const slug = href.replace(/^\/storefront\//, '').replace(/\/$/, '')
      listings.push({
        id: `b4a-cal-${county.key}-${slug}`,
        county: county.name,
        countyKey: county.key,
        state: 'MI',
        address: title,
        openingBid: null,
        saleDate,
        auctionTitle: title,
        source: 'calendar',
        auctionUrl: href.startsWith('http') ? href : `${ORIGIN}${href}`,
        auctionId: null,
      })
    }
  }

  return listings
}

async function searchCountyListings(
  county: Bid4AssetsCounty,
  csrfToken: string | null
): Promise<Bid4AssetsListing[]> {
  const body = {
    sort: 'bidclosetime',
    sortorder: 'ASC',
    searchtrackingid: '',
    datehistory: '6',
    type: 'powersearch',
    criteria: `${county.name} County Michigan`,
    keywordtype: 'allWords',
    searchfield: null,
    channel: null,
    category: null,
    subcategory: null,
    assetstatus: 'l',
    locatedstate: 'MI',
    zip: null,
    zipradius: null,
    sellerid: '',
    searchtype: 'ps',
    currentsearchquerystring: `&type=powersearch&criteria=${county.name}+County+Michigan&locatedState=MI`,
    page: 1,
    pageSize: 100,
    pageTake: 100,
    skip: 0,
  }

  const headers: Record<string, string> = {
    ...FETCH_HEADERS,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (csrfToken) headers['X-CSRF-Header-Token'] = csrfToken

  const res = await fetch(
    `${SEARCH_API_URL}?take=100&skip=0&page=1&pageSize=100`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      next: { revalidate: 120 },
    }
  )

  if (!res.ok) return []
  const data = (await res.json()) as SearchApiResponse
  const rows = data.data ?? []

  return rows
    .filter(row => matchesMichiganCounty(row.assetTitle ?? '', county))
    .map(row => {
      const closeIso = row.bidCloseTime ?? row.bidOpenTime ?? ''
      const saleDate = closeIso ? formatIsoDate(closeIso) : '—'
      const openingBid =
        parseMoney(row.currentBidString) ??
        (row.highBidAmount && row.highBidAmount > 0 ? row.highBidAmount : null) ??
        (row.currentBid && row.currentBid > 0 ? row.currentBid : null)

      const link = row.linkUrl?.trim()
      const auctionUrl = link
        ? link.startsWith('http')
          ? link
          : `${ORIGIN}${link}`
        : row.auctionId
          ? `${ORIGIN}/auction/${row.auctionId}`
          : null

      const city = row.locatedCity?.trim()
      const st = row.locatedState?.trim()
      const location =
        city && st && st.length <= 3
          ? `${city}, ${st}`
          : city && city.length > 3
            ? city
            : null
      const title = row.assetTitle?.trim() ?? `${county.name} County auction`
      const address = location ? `${title} · ${location}` : title

      return {
        id: `b4a-search-${row.auctionId ?? normalize(title)}`,
        county: county.name,
        countyKey: county.key,
        state: 'MI' as const,
        address,
        openingBid,
        saleDate,
        auctionTitle: title,
        source: 'search' as const,
        auctionUrl,
        auctionId: row.auctionId ?? null,
      }
    })
    .filter(row => row.saleDate === '—' || isUpcomingSale(row.saleDate))
}

export function mergeBid4AssetsListings(
  calendar: Bid4AssetsListing[],
  search: Bid4AssetsListing[]
): Bid4AssetsListing[] {
  const byId = new Map<string, Bid4AssetsListing>()
  for (const row of calendar) byId.set(row.id, row)
  for (const row of search) {
    const existing = row.auctionId
      ? [...byId.values()].find(
          e => e.auctionId === row.auctionId || e.auctionTitle === row.auctionTitle
        )
      : undefined
    if (!existing) byId.set(row.id, row)
  }
  return [...byId.values()].sort((a, b) => {
    const da = Date.parse(a.saleDate)
    const db = Date.parse(b.saleDate)
    if (!Number.isNaN(da) && !Number.isNaN(db) && da !== db) return da - db
    if (a.saleDate === '—' && b.saleDate !== '—') return 1
    if (b.saleDate === '—' && a.saleDate !== '—') return -1
    return a.county.localeCompare(b.county)
  })
}

export async function fetchMichiganBid4AssetsListings(): Promise<{
  listings: Bid4AssetsListing[]
  calendarCount: number
  searchCount: number
}> {
  const taxsaleRes = await fetch(BID4ASSETS_TAXSALE_URL, {
    headers: FETCH_HEADERS,
    next: { revalidate: 300 },
  })
  if (!taxsaleRes.ok) throw new Error(`Bid4Assets taxsale page failed (${taxsaleRes.status})`)
  const taxsaleHtml = await taxsaleRes.text()
  const calendar = parseTaxsaleCalendar(taxsaleHtml)

  const csrfToken = await fetchCsrfToken()
  const searchResults = await Promise.all(
    MI_BID4ASSETS_COUNTIES.map(async county => {
      try {
        return await searchCountyListings(county, csrfToken)
      } catch {
        return [] as Bid4AssetsListing[]
      }
    })
  )
  const search = searchResults.flat()

  const listings = mergeBid4AssetsListings(calendar, search)
  return {
    listings,
    calendarCount: calendar.length,
    searchCount: search.length,
  }
}
