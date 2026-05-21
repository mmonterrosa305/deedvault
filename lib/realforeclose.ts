/**
 * Miami-Dade RealForeclose auction preview — "Auctions Waiting" (Area W).
 * @see https://miamidade.realforeclose.com
 */

import { isUpcomingSale } from '@/lib/realtdm'

export const REALFORECLOSE_HOME_URL = 'https://miamidade.realforeclose.com'
export const REALFORECLOSE_PREVIEW_URL = `${REALFORECLOSE_HOME_URL}/index.cfm?zaction=AUCTION&Zmethod=PREVIEW`

/** Typical Miami-Dade online tax deed auction start (not always listed on preview cards). */
const DEFAULT_AUCTION_TIME = '9:00 AM ET'

const ORIGIN = REALFORECLOSE_HOME_URL
const DAYS_AHEAD = 90
const PAGE_SIZE_HINT = 10

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/json,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'X-Requested-With': 'XMLHttpRequest',
}

export type RealForecloseListing = {
  id: string
  county: string
  countyKey: string
  state: 'FL'
  caseNumber: string
  openingBid: number | null
  parcelId: string
  address: string
  assessedValue: number | null
  auctionDate: string
  auctionTime: string
  auctionDateTime: string
  auctionType: string
  certificateNumber: string | null
  auctionId: string
  auctionUrl: string
}

type LoadJson = {
  retHTML?: string
  rlist?: string
}

class ForecloseSession {
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

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  }

  async fetchText(url: string, referer?: string): Promise<string> {
    const headers: Record<string, string> = { ...FETCH_HEADERS }
    const ck = this.cookieHeader()
    if (ck) headers.Cookie = ck
    if (referer) headers.Referer = referer

    const res = await fetch(url, { headers, cache: 'no-store' })
    this.storeCookies(res)
    if (!res.ok) throw new Error(`RealForeclose request failed (${res.status})`)
    return res.text()
  }
}

function previewUrl(auctionDateMmDdYyyy: string): string {
  const enc = encodeURIComponent(auctionDateMmDdYyyy)
  return `${REALFORECLOSE_PREVIEW_URL}&AUCTIONDATE=${enc}`
}

function formatMmDdYyyy(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const y = d.getFullYear()
  return `${m}/${day}/${y}`
}

function parseMoney(value: string): number | null {
  const n = parseFloat(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeRetHtml(encoded: string): string {
  let html = encoded
  const reps: [string, string][] = [
    ['@A', '<div class="'],
    ['@B', '</div>'],
    ['@C', 'class="'],
    ['@D', '<div>'],
    ['@E', 'AUCTION'],
    ['@F', '</td><td'],
    ['@G', '</td></tr>'],
    ['@H', '<tr><td '],
    ['@I', 'table'],
    ['@J', 'p_back="NextCheck='],
    ['@K', 'style="Display:none"'],
    ['@L', '/index.cfm?zaction=auction&zmethod=details&AID='],
  ]
  for (const [a, b] of reps) html = html.split(a).join(b)
  return html
}

function extractJsonPayload(raw: string): LoadJson | null {
  const start = raw.indexOf('{"retHTML"')
  if (start < 0) return null
  try {
    return JSON.parse(raw.slice(start)) as LoadJson
  } catch {
    return null
  }
}

function parseDisplayDate(html: string, fallbackMmDdYyyy: string): string {
  const m = html.match(/class="BLHeaderDateDisplay"[^>]*>([^<]+)</i)
  return m?.[1]?.trim() ?? fallbackMmDdYyyy
}

function isoDateFromMmDdYyyy(mmDdYyyy: string): string {
  const m = mmDdYyyy.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return mmDdYyyy
  const [, mo, da, yr] = m
  return `${yr}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`
}

function parseTableFields(block: string): Record<string, string> {
  const fields: Record<string, string> = {}
  const rowRe =
    /<tr[^>]*>[\s\S]*?AD_LBL[^>]*>([^<]*):?<\/td>[\s\S]*?AD_DTA[^>]*>([\s\S]*?)<\/td>/gi
  let match: RegExpExecArray | null
  while ((match = rowRe.exec(block)) !== null) {
    const label = stripTags(match[1]).replace(/:$/, '').trim()
    const value = stripTags(match[2]).trim()
    if (!label) continue
    if (label === 'Property Address' && fields['Property Address']) {
      fields['Property Address Line 2'] = value
    } else {
      fields[label] = value
    }
  }
  return fields
}

function buildAddress(fields: Record<string, string>): string {
  const line1 = fields['Property Address']?.trim()
  const line2 = fields['Property Address Line 2']?.trim()
  if (line1 && line2) return `${line1}, ${line2}`
  return line1 || line2 || '—'
}

function parseAuctionBlocks(
  html: string,
  auctionDateMmDdYyyy: string,
  displayDate: string
): RealForecloseListing[] {
  const isoDate = isoDateFromMmDdYyyy(auctionDateMmDdYyyy)
  const auctionDateTime = `${displayDate} · ${DEFAULT_AUCTION_TIME}`
  const listings: RealForecloseListing[] = []

  const blocks = html.split(/<div id="AITEM_/).slice(1)
  for (const block of blocks) {
    const aidMatch = block.match(/^(\d+)"/)
    if (!aidMatch) continue
    const auctionId = aidMatch[1]
    const fields = parseTableFields(block)
    const caseNumber = (fields['Case #'] ?? fields['Case Number'] ?? '').trim()
    const parcelId = (fields['Parcel ID'] ?? '').trim()
    const auctionType = (fields['Auction Type'] ?? '').trim()

    listings.push({
      id: `rf-${auctionId}-${caseNumber.replace(/\s+/g, '') || parcelId}`,
      county: 'Miami-Dade',
      countyKey: 'miamidade',
      state: 'FL',
      caseNumber: caseNumber || '—',
      openingBid: parseMoney(fields['Opening Bid'] ?? ''),
      parcelId: parcelId || '—',
      address: buildAddress(fields),
      assessedValue: parseMoney(fields['Assessed Value'] ?? ''),
      auctionDate: isoDate,
      auctionTime: DEFAULT_AUCTION_TIME,
      auctionDateTime,
      auctionType: auctionType || '—',
      certificateNumber: fields['Certificate #']?.trim() || null,
      auctionId,
      auctionUrl: `${ORIGIN}/index.cfm?zaction=auction&zmethod=details&AID=${auctionId}`,
    })
  }

  return listings
}

async function fetchWaitingForDate(
  session: ForecloseSession,
  auctionDateMmDdYyyy: string
): Promise<RealForecloseListing[]> {
  const preview = previewUrl(auctionDateMmDdYyyy)
  const previewHtml = await session.fetchText(preview)
  const albMatch = previewHtml.match(/id="ALB"[^>]*>([^<]+)/i)
  const alb = albMatch?.[1]?.trim()
  if (!alb) return []

  const displayDate = parseDisplayDate(previewHtml, auctionDateMmDdYyyy)
  const encAlb = encodeURIComponent(alb)
  const tx = () => String(Date.now())

  await session.fetchText(
    `${ORIGIN}/index.cfm?zaction=AUCTION&ZMETHOD=UPDATE&FNC=RESET&ALB=${encAlb}&tx=${tx()}`,
    preview
  )
  await session.fetchText(
    `${ORIGIN}/index.cfm?zaction=AUCTION&Zmethod=UPDATE&FNC=LOAD&AREA=R&PageDir=0&doR=1&tx=${tx()}&bypassPage=1`,
    preview
  )

  const seenIds = new Set<string>()
  const allHtml: string[] = []

  for (let page = 1; page <= 12; page++) {
    const loadRaw = await session.fetchText(
      `${ORIGIN}/index.cfm?zaction=AUCTION&Zmethod=UPDATE&FNC=LOAD&AREA=W&PageDir=0&doR=1&tx=${tx()}&bypassPage=${page}`,
      preview
    )
    const payload = extractJsonPayload(loadRaw)
    const encoded = payload?.retHTML ?? ''
    if (!encoded) break

    const decoded = decodeRetHtml(encoded)
    const ids = [...decoded.matchAll(/id="AITEM_(\d+)"/g)].map(m => m[1])
    const newIds = ids.filter(id => !seenIds.has(id))
    if (newIds.length === 0 && page > 1) break

    for (const id of ids) seenIds.add(id)
    allHtml.push(decoded)

    if (ids.length < PAGE_SIZE_HINT && page > 1) break
  }

  const combined = allHtml.join('')
  const listings = parseAuctionBlocks(combined, auctionDateMmDdYyyy, displayDate)
  const isoDate = isoDateFromMmDdYyyy(auctionDateMmDdYyyy)
  return listings.filter(l => isUpcomingSale(isoDate))
}

function upcomingDates(): string[] {
  const dates: string[] = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(formatMmDdYyyy(d))
  }
  return dates
}

/** Fetch upcoming Miami-Dade tax deed auctions from RealForeclose preview pages. */
export async function fetchMiamiDadeRealForecloseListings(): Promise<{
  listings: RealForecloseListing[]
  datesScanned: number
  datesWithAuctions: number
}> {
  const dates = upcomingDates()
  const byId = new Map<string, RealForecloseListing>()
  let datesWithAuctions = 0

  const concurrency = 4
  for (let i = 0; i < dates.length; i += concurrency) {
    const batch = dates.slice(i, i + concurrency)
    const results = await Promise.all(
      batch.map(async date => {
        const session = new ForecloseSession()
        try {
          return await fetchWaitingForDate(session, date)
        } catch {
          return [] as RealForecloseListing[]
        }
      })
    )
    for (const list of results) {
      if (list.length > 0) datesWithAuctions++
      for (const row of list) {
        byId.set(row.id, row)
      }
    }
  }

  const listings = [...byId.values()].sort((a, b) => {
    const da = Date.parse(a.auctionDate)
    const db = Date.parse(b.auctionDate)
    if (!Number.isNaN(da) && !Number.isNaN(db) && da !== db) return da - db
    return a.caseNumber.localeCompare(b.caseNumber)
  })

  return { listings, datesScanned: dates.length, datesWithAuctions }
}
