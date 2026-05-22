/**
 * Florida RealForeclose auction preview — "Auctions Waiting" (Area W) per county subdomain.
 * @see https://www.realforeclose.com
 */

import { isUpcomingSale } from '@/lib/realtdm'

export const REALFORECLOSE_HOME_URL = 'https://www.realforeclose.com'

/** Typical Florida online tax deed auction start when not listed on preview cards. */
const DEFAULT_AUCTION_TIME = '9:00 AM ET'

const DAYS_AHEAD = 90
const PAGE_SIZE_HINT = 10
const DATE_CONCURRENCY = 4
const COUNTY_CONCURRENCY = 4
const COUNTY_FETCH_RETRIES = 2
const DETAIL_BID_CONCURRENCY = 6

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/json,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'X-Requested-With': 'XMLHttpRequest',
}

export const FL_REALFORECLOSE_COUNTIES = [
  { key: 'miamidade', name: 'Miami-Dade', subdomain: 'miamidade' },
  { key: 'broward', name: 'Broward', subdomain: 'broward' },
  { key: 'palmbeach', name: 'Palm Beach', subdomain: 'palmbeach' },
  { key: 'hillsborough', name: 'Hillsborough', subdomain: 'hillsborough' },
  { key: 'pinellas', name: 'Pinellas', subdomain: 'pinellas' },
  { key: 'polk', name: 'Polk', subdomain: 'polk' },
  { key: 'volusia', name: 'Volusia', subdomain: 'volusia' },
  { key: 'marion', name: 'Marion', subdomain: 'marion' },
  { key: 'lake', name: 'Lake', subdomain: 'lake', hostname: 'lake.realtaxdeed.com' },
  { key: 'osceola', name: 'Osceola', subdomain: 'osceola', hostname: 'osceola.realtaxdeed.com' },
  { key: 'brevard', name: 'Brevard', subdomain: 'brevard' },
  { key: 'pasco', name: 'Pasco', subdomain: 'pasco' },
  { key: 'manatee', name: 'Manatee', subdomain: 'manatee' },
  { key: 'sarasota', name: 'Sarasota', subdomain: 'sarasota' },
  { key: 'charlotte', name: 'Charlotte', subdomain: 'charlotte' },
  { key: 'lee', name: 'Lee', subdomain: 'lee' },
  { key: 'collier', name: 'Collier', subdomain: 'collier' },
  { key: 'stlucie', name: 'St. Lucie', subdomain: 'stlucie' },
  { key: 'indianriver', name: 'Indian River', subdomain: 'indianriver' },
  { key: 'seminole', name: 'Seminole', subdomain: 'seminole' },
  { key: 'orange', name: 'Orange', subdomain: 'orange' },
  { key: 'alachua', name: 'Alachua', subdomain: 'alachua' },
  { key: 'duval', name: 'Duval', subdomain: 'duval' },
  { key: 'escambia', name: 'Escambia', subdomain: 'escambia' },
  { key: 'leon', name: 'Leon', subdomain: 'leon' },
] as const

export type RealForecloseCounty = (typeof FL_REALFORECLOSE_COUNTIES)[number]

export const FL_REALFORECLOSE_COUNTY_COUNT = FL_REALFORECLOSE_COUNTIES.length

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

export type RealForecloseCountyCount = {
  countyKey: string
  county: string
  count: number
}

type LoadJson = {
  retHTML?: string
  rlist?: string
}

function countyHostname(county: RealForecloseCounty): string {
  return 'hostname' in county && county.hostname
    ? county.hostname
    : `${county.subdomain}.realforeclose.com`
}

function countyOrigin(county: RealForecloseCounty): string {
  return `https://${countyHostname(county)}`
}

/** RealForeclose / realTaxDeed portal is configured for this county (not redirected to generic RealAuction). */
async function isCountyPortalActive(county: RealForecloseCounty): Promise<boolean> {
  const origin = countyOrigin(county)
  const session = new ForecloseSession()
  try {
    const html = await session.fetchText(`${origin}/index.cfm?zaction=AUCTION&Zmethod=PREVIEW`)
    if (/Online Auction Software Solutions/i.test(html)) return false
    return (
      /Auction Calendar/i.test(html) ||
      html.includes('id="ALB"') ||
      /RealForeclose/i.test(html) ||
      /realtaxdeed/i.test(html)
    )
  } catch {
    return false
  }
}

function previewUrl(origin: string, auctionDateMmDdYyyy: string): string {
  const enc = encodeURIComponent(auctionDateMmDdYyyy)
  return `${origin}/index.cfm?zaction=AUCTION&Zmethod=PREVIEW&AUCTIONDATE=${enc}`
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
    ['@CAD_LBL', 'AD_LBL'],
    ['@CAD_DTA', 'AD_DTA'],
  ]
  for (const [a, b] of reps) html = html.split(a).join(b)
  return html
}

/** Normalize auction type for comparison (e.g. "TAX DEED" → TAXDEED). */
function normalizeAuctionType(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
}

/** Only tax deed sales — excludes FORECLOSURE, mortgage, and other types. */
export function isTaxDeedAuctionType(auctionType: string): boolean {
  return normalizeAuctionType(auctionType) === 'TAXDEED'
}

/** Mortgage / certificate foreclosure auctions on RealForeclose. */
export function isForeclosureAuctionType(auctionType: string): boolean {
  return normalizeAuctionType(auctionType) === 'FORECLOSURE'
}

export type RealForecloseAuctionKind = 'taxdeed' | 'foreclosure' | 'all'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function matchesAuctionKind(auctionType: string, kind: RealForecloseAuctionKind): boolean {
  if (kind === 'all') return true
  return kind === 'taxdeed'
    ? isTaxDeedAuctionType(auctionType)
    : isForeclosureAuctionType(auctionType)
}

function resolveStoredAuctionType(
  auctionType: string,
  fields: Record<string, string>
): string {
  const norm = normalizeAuctionType(auctionType)
  if (norm === 'TAXDEED' || norm.includes('TAXDEED')) return 'TAXDEED'
  if (norm === 'FORECLOSURE' || norm.includes('FORECLOSURE')) return 'FORECLOSURE'
  if (fields['Certificate #']?.trim() || fields['Opening Bid']?.trim()) return 'TAXDEED'
  if (fields['Final Judgment Amount']?.trim() || fields['Plaintiff Max Bid']?.trim()) {
    return 'FORECLOSURE'
  }
  return auctionType.trim() || '—'
}

function mmDdYyyyFromIso(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  const [, yr, mo, da] = m
  return `${mo}/${da}/${yr}`
}

function addParsedField(
  fields: Record<string, string>,
  labelRaw: string,
  valueRaw: string
): void {
  const label = stripTags(labelRaw).replace(/:$/, '').trim()
  const value = stripTags(valueRaw).trim()
  if (!label) return
  if (label === 'Property Address' && fields['Property Address']) {
    fields['Property Address Line 2'] = value
  } else {
    fields[label] = value
  }
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
    addParsedField(fields, match[1], match[2])
  }
  const divRe =
    /AD_LBL[^>]*>([^<]*):?<\/div>\s*<div[^>]*AD_DTA[^>]*>([\s\S]*?)<\/div>/gi
  while ((match = divRe.exec(block)) !== null) {
    addParsedField(fields, match[1], match[2])
  }
  return fields
}

function parseBidFromFields(fields: Record<string, string>): number | null {
  const opening = parseMoney(fields['Opening Bid'] ?? '')
  if (opening != null) return opening
  const judgment = parseMoney(fields['Final Judgment Amount'] ?? '')
  if (judgment != null) return judgment
  const plaintiff = fields['Plaintiff Max Bid']?.trim()
  if (plaintiff && !/hidden/i.test(plaintiff)) {
    return parseMoney(plaintiff)
  }
  return null
}

function parseOpeningBidFromHtml(html: string, auctionId: string): number | null {
  const block =
    html.split(`id="AITEM_${auctionId}"`)[1]?.split(/id="AITEM_\d+"/)[0] ?? html
  return parseBidFromFields(parseTableFields(block))
}

function buildAddress(fields: Record<string, string>): string {
  const line1 = fields['Property Address']?.trim()
  const line2 = fields['Property Address Line 2']?.trim()
  if (line1 && line2) return `${line1}, ${line2}`
  return line1 || line2 || '—'
}

function parseAuctionBlocks(
  html: string,
  county: RealForecloseCounty,
  origin: string,
  auctionDateMmDdYyyy: string,
  displayDate: string,
  kind: RealForecloseAuctionKind
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
    if (!matchesAuctionKind(auctionType, kind)) continue
    if (!caseNumber && !parcelId) continue

    const caseSlug = caseNumber.replace(/\s+/g, '') || parcelId || auctionId
    const storedType = resolveStoredAuctionType(auctionType, fields)

    listings.push({
      id: `rf-${county.key}-${auctionId}-${caseSlug}`,
      county: county.name,
      countyKey: county.key,
      state: 'FL',
      caseNumber: caseNumber || '—',
      openingBid: parseBidFromFields(fields),
      parcelId: parcelId || '—',
      address: buildAddress(fields),
      assessedValue: parseMoney(fields['Assessed Value'] ?? ''),
      auctionDate: isoDate,
      auctionTime: DEFAULT_AUCTION_TIME,
      auctionDateTime,
      auctionType: storedType,
      certificateNumber: fields['Certificate #']?.trim() || null,
      auctionId,
      auctionUrl: `${origin}/index.cfm?zaction=auction&zmethod=details&AID=${auctionId}`,
    })
  }

  return listings
}

async function fetchWaitingForDate(
  session: ForecloseSession,
  county: RealForecloseCounty,
  origin: string,
  auctionDateMmDdYyyy: string,
  kind: RealForecloseAuctionKind
): Promise<RealForecloseListing[]> {
  const preview = previewUrl(origin, auctionDateMmDdYyyy)
  const previewHtml = await session.fetchText(preview)
  const albMatch = previewHtml.match(/id="ALB"[^>]*>([^<]+)/i)
  const alb = albMatch?.[1]?.trim()
  if (!alb) return []

  const displayDate = parseDisplayDate(previewHtml, auctionDateMmDdYyyy)
  const encAlb = encodeURIComponent(alb)
  const tx = () => String(Date.now())

  await session.fetchText(
    `${origin}/index.cfm?zaction=AUCTION&ZMETHOD=UPDATE&FNC=RESET&ALB=${encAlb}&tx=${tx()}`,
    preview
  )
  await session.fetchText(
    `${origin}/index.cfm?zaction=AUCTION&Zmethod=UPDATE&FNC=LOAD&AREA=R&PageDir=0&doR=1&tx=${tx()}&bypassPage=1`,
    preview
  )

  const seenIds = new Set<string>()
  const allHtml: string[] = []

  for (let page = 1; page <= 12; page++) {
    const loadRaw = await session.fetchText(
      `${origin}/index.cfm?zaction=AUCTION&Zmethod=UPDATE&FNC=LOAD&AREA=W&PageDir=0&doR=1&tx=${tx()}&bypassPage=${page}`,
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
  const listings = parseAuctionBlocks(
    combined,
    county,
    origin,
    auctionDateMmDdYyyy,
    displayDate,
    kind
  )
  const isoDate = isoDateFromMmDdYyyy(auctionDateMmDdYyyy)
  const upcoming = listings.filter(l => isUpcomingSale(isoDate))
  if (upcoming.length > 0 && alb) {
    await enrichMissingOpeningBids(session, origin, preview, upcoming)
  }
  return upcoming
}

async function enrichMissingOpeningBids(
  session: ForecloseSession,
  origin: string,
  preview: string,
  listings: RealForecloseListing[]
): Promise<void> {
  const missing = listings.filter(l => l.openingBid == null)
  if (missing.length === 0) return

  const tx = () => String(Date.now())

  for (let i = 0; i < missing.length; i += DETAIL_BID_CONCURRENCY) {
    const batch = missing.slice(i, i + DETAIL_BID_CONCURRENCY)
    await Promise.all(
      batch.map(async listing => {
        try {
          const loadRaw = await session.fetchText(
            `${origin}/index.cfm?zaction=AUCTION&Zmethod=UPDATE&FNC=LOAD&AREA=W&AID=${listing.auctionId}&tx=${tx()}`,
            preview
          )
          const payload = extractJsonPayload(loadRaw)
          if (!payload?.retHTML) return
          const bid = parseOpeningBidFromHtml(decodeRetHtml(payload.retHTML), listing.auctionId)
          if (bid != null) listing.openingBid = bid
        } catch {
          /* keep null bid */
        }
      })
    )
  }
}

async function fetchOpeningBidFromDetailPage(
  county: RealForecloseCounty,
  listing: RealForecloseListing
): Promise<number | null> {
  const origin = countyOrigin(county)
  const mmDdYyyy = mmDdYyyyFromIso(listing.auctionDate)
  const preview = previewUrl(origin, mmDdYyyy)
  const session = new ForecloseSession()
  try {
    const previewHtml = await session.fetchText(preview)
    const albMatch = previewHtml.match(/id="ALB"[^>]*>([^<]+)/i)
    if (!albMatch) return null
    const encAlb = encodeURIComponent(albMatch[1].trim())
    const tx = () => String(Date.now())
    await session.fetchText(
      `${origin}/index.cfm?zaction=AUCTION&ZMETHOD=UPDATE&FNC=RESET&ALB=${encAlb}&tx=${tx()}`,
      preview
    )
    await session.fetchText(
      `${origin}/index.cfm?zaction=AUCTION&Zmethod=UPDATE&FNC=LOAD&AREA=R&PageDir=0&doR=1&tx=${tx()}&bypassPage=1`,
      preview
    )
    const loadRaw = await session.fetchText(
      `${origin}/index.cfm?zaction=AUCTION&Zmethod=UPDATE&FNC=LOAD&AREA=W&AID=${listing.auctionId}&tx=${tx()}`,
      preview
    )
    const payload = extractJsonPayload(loadRaw)
    if (!payload?.retHTML) return null
    return parseOpeningBidFromHtml(decodeRetHtml(payload.retHTML), listing.auctionId)
  } catch {
    return null
  }
}

async function enrichCountyMissingOpeningBids(
  county: RealForecloseCounty,
  listings: RealForecloseListing[]
): Promise<void> {
  const missing = listings.filter(l => l.openingBid == null)
  if (missing.length === 0) return

  const origin = countyOrigin(county)
  const byDate = new Map<string, RealForecloseListing[]>()
  for (const listing of missing) {
    const key = mmDdYyyyFromIso(listing.auctionDate)
    const group = byDate.get(key) ?? []
    group.push(listing)
    byDate.set(key, group)
  }

  for (const [mmDdYyyy, group] of byDate) {
    const preview = previewUrl(origin, mmDdYyyy)
    const session = new ForecloseSession()
    try {
      const previewHtml = await session.fetchText(preview)
      const albMatch = previewHtml.match(/id="ALB"[^>]*>([^<]+)/i)
      if (!albMatch) continue
      const encAlb = encodeURIComponent(albMatch[1].trim())
      const tx = () => String(Date.now())
      await session.fetchText(
        `${origin}/index.cfm?zaction=AUCTION&ZMETHOD=UPDATE&FNC=RESET&ALB=${encAlb}&tx=${tx()}`,
        preview
      )
      await session.fetchText(
        `${origin}/index.cfm?zaction=AUCTION&Zmethod=UPDATE&FNC=LOAD&AREA=R&PageDir=0&doR=1&tx=${tx()}&bypassPage=1`,
        preview
      )
      await enrichMissingOpeningBids(session, origin, preview, group)
    } catch {
      for (let i = 0; i < group.length; i += DETAIL_BID_CONCURRENCY) {
        const batch = group.slice(i, i + DETAIL_BID_CONCURRENCY)
        await Promise.all(
          batch.map(async listing => {
            const bid = await fetchOpeningBidFromDetailPage(county, listing)
            if (bid != null) listing.openingBid = bid
          })
        )
      }
    }
  }
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

function buildCountyCounts(listings: RealForecloseListing[]): RealForecloseCountyCount[] {
  const counts = new Map<string, RealForecloseCountyCount>()
  for (const county of FL_REALFORECLOSE_COUNTIES) {
    counts.set(county.key, {
      countyKey: county.key,
      county: county.name,
      count: 0,
    })
  }
  for (const row of listings) {
    const existing = counts.get(row.countyKey)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(row.countyKey, {
        countyKey: row.countyKey,
        county: row.county,
        count: 1,
      })
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.county.localeCompare(b.county))
}

async function fetchCountyListings(
  county: RealForecloseCounty,
  kind: RealForecloseAuctionKind
): Promise<RealForecloseListing[]> {
  if (!(await isCountyPortalActive(county))) {
    return []
  }

  const origin = countyOrigin(county)
  const dates = upcomingDates()
  const byId = new Map<string, RealForecloseListing>()

  for (let i = 0; i < dates.length; i += DATE_CONCURRENCY) {
    const batch = dates.slice(i, i + DATE_CONCURRENCY)
    const results = await Promise.all(
      batch.map(async date => {
        const session = new ForecloseSession()
        try {
          return await fetchWaitingForDate(session, county, origin, date, kind)
        } catch {
          return [] as RealForecloseListing[]
        }
      })
    )
    for (const list of results) {
      for (const row of list) {
        byId.set(row.id, row)
      }
    }
  }

  const listings = [...byId.values()]
  await enrichCountyMissingOpeningBids(county, listings)
  return listings
}

async function fetchFloridaRealForecloseByKind(kind: RealForecloseAuctionKind): Promise<{
  listings: RealForecloseListing[]
  datesScanned: number
  datesWithAuctions: number
  countyCounts: RealForecloseCountyCount[]
  countiesScanned: number
  countiesWithListings: number
}> {
  const dates = upcomingDates()

  const countyResults: {
    county: RealForecloseCounty
    listings: RealForecloseListing[]
    err: boolean
  }[] = []

  for (let i = 0; i < FL_REALFORECLOSE_COUNTIES.length; i += COUNTY_CONCURRENCY) {
    const batch = FL_REALFORECLOSE_COUNTIES.slice(i, i + COUNTY_CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map(async county => {
        for (let attempt = 0; attempt <= COUNTY_FETCH_RETRIES; attempt++) {
          try {
            const listings = await fetchCountyListings(county, kind)
            return { county, listings, err: false as const }
          } catch {
            if (attempt < COUNTY_FETCH_RETRIES) {
              await sleep(400 * (attempt + 1))
              continue
            }
            return { county, listings: [] as RealForecloseListing[], err: true as const }
          }
        }
        return { county, listings: [] as RealForecloseListing[], err: true as const }
      })
    )
    countyResults.push(...batchResults)
  }

  const byId = new Map<string, RealForecloseListing>()
  let datesWithAuctions = 0
  const datesSeen = new Set<string>()

  for (const { listings } of countyResults) {
    for (const row of listings) {
      byId.set(row.id, row)
      datesSeen.add(row.auctionDate)
    }
  }
  datesWithAuctions = datesSeen.size

  const listings = [...byId.values()].sort((a, b) => {
    const da = Date.parse(a.auctionDate)
    const db = Date.parse(b.auctionDate)
    if (!Number.isNaN(da) && !Number.isNaN(db) && da !== db) return da - db
    if (a.county !== b.county) return a.county.localeCompare(b.county)
    return a.caseNumber.localeCompare(b.caseNumber)
  })

  const countyCounts = buildCountyCounts(listings)
  const countiesWithListings = countyCounts.filter(c => c.count > 0).length

  return {
    listings,
    datesScanned: dates.length,
    datesWithAuctions,
    countyCounts,
    countiesScanned: FL_REALFORECLOSE_COUNTY_COUNT,
    countiesWithListings,
  }
}

/** Fetch all upcoming waiting auctions from 25 RealForeclose county sites (90-day preview scan). */
export async function fetchFloridaRealForecloseListings(): Promise<{
  listings: RealForecloseListing[]
  datesScanned: number
  datesWithAuctions: number
  countyCounts: RealForecloseCountyCount[]
  countiesScanned: number
  countiesWithListings: number
}> {
  return fetchFloridaRealForecloseByKind('all')
}

/** Fetch upcoming Florida foreclosure auctions from all RealForeclose county sites. */
export async function fetchFloridaForeclosureAuctions(): Promise<{
  listings: RealForecloseListing[]
  datesScanned: number
  datesWithAuctions: number
  countyCounts: RealForecloseCountyCount[]
  countiesScanned: number
  countiesWithListings: number
}> {
  return fetchFloridaRealForecloseByKind('foreclosure')
}

/** @deprecated Use fetchFloridaRealForecloseListings */
export const fetchMiamiDadeRealForecloseListings = fetchFloridaRealForecloseListings
