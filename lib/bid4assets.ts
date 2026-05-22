/**
 * Bid4Assets Michigan tax sale listings.
 * Calendar: https://www.bid4assets.com/taxsale
 * Search API: https://www.bid4assets.com/api/search/process (requires session cookies + CSRF)
 */

import { isUpcomingSale } from '@/lib/realtdm'

export const BID4ASSETS_HOME_URL = 'https://www.bid4assets.com'
export const BID4ASSETS_TAXSALE_URL = 'https://www.bid4assets.com/taxsale'

const ORIGIN = 'https://www.bid4assets.com'
const SEARCH_PAGE_URL = `${ORIGIN}/v5/search`
const SEARCH_API_URL = `${ORIGIN}/api/search/process`

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/json,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
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

type SearchSession = {
  csrfToken: string
  cookieHeader: string
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

function countyKeyFromName(name: string): string {
  return normalize(name.replace(/\s+County$/i, ''))
}

function matchesMichiganCounty(title: string, county: Bid4AssetsCounty): boolean {
  const t = title.toLowerCase()
  const name = county.name.toLowerCase()
  if (!t.includes(name)) return false
  return (
    t.includes('michigan') ||
    t.includes(', mi') ||
    /\bmi\b/.test(t) ||
    t.includes(`${name} county`)
  )
}

function isMichiganAuctionTitle(title: string): boolean {
  if (/Michigan/i.test(title)) return true
  if (/,\s*MI\b/.test(title)) return true
  return MI_BID4ASSETS_COUNTIES.some(c => matchesMichiganCounty(title, c))
}

function countyFromTitle(title: string): { name: string; key: string } {
  const michiganCounty = title.match(/Michigan,\s*([A-Za-z\s]+?)\s*County/i)
  if (michiganCounty) {
    const name = michiganCounty[1].trim()
    return { name, key: countyKeyFromName(name) }
  }

  const known = MI_BID4ASSETS_COUNTIES.find(c => matchesMichiganCounty(title, c))
  if (known) return { name: known.name, key: known.key }

  const countyMi = title.match(/([A-Za-z\s]+?)\s*County,\s*MI\b/i)
  if (countyMi) {
    const name = countyMi[1].trim()
    return { name, key: countyKeyFromName(name) }
  }

  return { name: 'Michigan', key: 'michigan' }
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

function isUpcomingBidTime(iso: string | null | undefined): boolean {
  if (!iso) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d.getTime() >= today.getTime()
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

class Bid4AssetsSession {
  private cookies = new Map<string, string>()

  private storeCookies(res: Response) {
    const getSetCookie = (res.headers as Headers & { getSetCookie?: () => string[] })
      .getSetCookie
    const parts = getSetCookie ? getSetCookie.call(res.headers) : []
    if (parts.length === 0) {
      const single = res.headers.get('set-cookie')
      if (single) parts.push(single)
    }
    for (const part of parts) {
      const seg = part.split(';')[0]?.trim()
      const eq = seg?.indexOf('=')
      if (seg && eq != null && eq > 0) {
        this.cookies.set(seg.slice(0, eq), seg.slice(eq + 1))
      }
    }
  }

  cookieHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  }

  async fetch(url: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers)
    headers.set('User-Agent', FETCH_HEADERS['User-Agent'])
    if (!headers.has('Accept')) headers.set('Accept', FETCH_HEADERS.Accept)
    const ck = this.cookieHeader()
    if (ck) headers.set('Cookie', ck)
    const res = await fetch(url, { ...init, headers, cache: 'no-store' })
    this.storeCookies(res)
    return res
  }
}

async function initSearchSession(): Promise<SearchSession | null> {
  const session = new Bid4AssetsSession()
  const res = await session.fetch(SEARCH_PAGE_URL)
  if (!res.ok) return null
  const html = await res.text()
  const csrfToken = html.match(
    /name="__RequestVerificationToken"[^>]*value="([^"]+)"/i
  )?.[1]
  if (!csrfToken) return null
  return { csrfToken, cookieHeader: session.cookieHeader() }
}

function parseTaxsaleCalendar(html: string): Bid4AssetsListing[] {
  const listings: Bid4AssetsListing[] = []
  const monthParts = html.split(/<div class="month"[^>]*data-year="(\d+)"[^>]*>/gi)

  for (let i = 1; i < monthParts.length; i += 2) {
    const year = Number(monthParts[i]) || new Date().getFullYear()
    const block = monthParts[i + 1] ?? ''

    const itemRe =
      /<li>\s*<a href="([^"]+)">([\s\S]*?)<\/a>\s*<span>([\s\S]*?)<\/span>\s*<\/li>/gi
    let match: RegExpExecArray | null
    while ((match = itemRe.exec(block)) !== null) {
      const href = match[1].trim()
      const title = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      const dateSpan = match[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      if (!title || !isMichiganAuctionTitle(title)) continue

      const county = countyFromTitle(title)
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

function rowToListing(row: SearchApiRow): Bid4AssetsListing | null {
  const title = row.assetTitle?.trim()
  if (!title || !isMichiganAuctionTitle(title)) return null

  const closeIso = row.bidCloseTime ?? row.bidOpenTime ?? ''
  if (!closeIso || !isUpcomingBidTime(closeIso)) return null

  const county = countyFromTitle(title)
  const saleDate = formatIsoDate(closeIso)
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
  const address = location ? `${title} · ${location}` : title

  return {
    id: `b4a-search-${row.auctionId ?? normalize(title)}`,
    county: county.name,
    countyKey: county.key,
    state: 'MI',
    address,
    openingBid,
    saleDate,
    auctionTitle: title,
    source: 'search',
    auctionUrl,
    auctionId: row.auctionId ?? null,
  }
}

async function searchMichiganApi(
  session: SearchSession,
  criteria: string
): Promise<SearchApiResponse | null> {
  const body = {
    sort: 'bidclosetime',
    sortorder: 'ASC',
    searchtrackingid: '',
    datehistory: '6',
    type: 'powersearch',
    criteria,
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
    currentsearchquerystring: `&type=powersearch&criteria=${encodeURIComponent(criteria)}&locatedState=MI`,
    page: 1,
    pageSize: 100,
    pageTake: 100,
    skip: 0,
  }

  const headers: Record<string, string> = {
    ...FETCH_HEADERS,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-CSRF-Header-Token': session.csrfToken,
    Cookie: session.cookieHeader,
  }

  const res = await fetch(
    `${SEARCH_API_URL}?take=100&skip=0&page=1&pageSize=100`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    }
  )

  if (!res.ok) return null
  return (await res.json()) as SearchApiResponse
}

async function searchMichiganListings(
  session: SearchSession,
  criteria: string
): Promise<Bid4AssetsListing[]> {
  const data = await searchMichiganApi(session, criteria)
  if (!data) return []
  const listings: Bid4AssetsListing[] = []
  for (const row of data.data ?? []) {
    const listing = rowToListing(row)
    if (listing) listings.push(listing)
  }
  return listings
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
  searchTotal: number
}> {
  const taxsaleRes = await fetch(BID4ASSETS_TAXSALE_URL, {
    headers: FETCH_HEADERS,
    cache: 'no-store',
  })
  if (!taxsaleRes.ok) throw new Error(`Bid4Assets taxsale page failed (${taxsaleRes.status})`)
  const taxsaleHtml = await taxsaleRes.text()
  const calendar = parseTaxsaleCalendar(taxsaleHtml)

  const session = await initSearchSession()
  let search: Bid4AssetsListing[] = []
  let searchTotal = 0

  if (session) {
    const byId = new Map<string, Bid4AssetsListing>()
    const criteriaList = [
      'Michigan',
      'Michigan tax deed',
      ...MI_BID4ASSETS_COUNTIES.map(c => `${c.name} County Michigan`),
    ]

    const michiganData = await searchMichiganApi(session, 'Michigan')
    searchTotal = michiganData?.total ?? michiganData?.data?.length ?? 0

    for (const criteria of criteriaList) {
      const found = await searchMichiganListings(session, criteria)
      for (const listing of found) byId.set(listing.id, listing)
    }

    search = [...byId.values()]
  }

  const listings = mergeBid4AssetsListings(calendar, search)
  return {
    listings,
    calendarCount: calendar.length,
    searchCount: search.length,
    searchTotal,
  }
}
