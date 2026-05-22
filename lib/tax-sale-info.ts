/**
 * tax-sale.info (Title Check, LLC) — Michigan public land / tax foreclosure auctions.
 * Scrapes auction catalog pages and lot detail pages (no auth required for public lots).
 */

import { isUpcomingSale } from '@/lib/realtdm'
import {
  MI_TARGET_COUNTIES,
  normalizeMichiganCountyKey,
  type MichiganTargetCountyKey,
} from '@/lib/michigan-counties'

export const TAX_SALE_HOME_URL = 'https://www.tax-sale.info'
export const TAX_SALE_AUCTIONS_URL = 'https://www.tax-sale.info/auctions'

const ORIGIN = 'https://www.tax-sale.info'

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,*/*',
}

const TARGET_NAMES = MI_TARGET_COUNTIES.map(c => c.name)

export type TaxSaleListing = {
  id: string
  county: string
  countyKey: string
  state: 'MI'
  address: string
  /** tax-sale.info lot number (displayed as case # in DeedVault). */
  lotNumber: string
  parcelId: string
  openingBid: number | null
  saleDate: string
  saleDateDisplay: string
  /** Regional auction name, e.g. "Allegan, Berrien, Cass, Van Buren". */
  auctionGroup: string
  auctionUrl: string
  lotUrl: string
  source: 'auction-page' | 'catalog-csv'
}

type AuctionSchedule = {
  saleDate: string
  saleDateDisplay: string
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

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function scheduleFromIsoDate(isoDate: string, display?: string): AuctionSchedule {
  const d = isoDate.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return { saleDate: '—', saleDateDisplay: display?.trim() || '—' }
  }
  const parsed = new Date(`${d}T12:00:00`)
  const saleDateDisplay =
    display?.trim() ||
    (Number.isNaN(parsed.getTime())
      ? d
      : parsed.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }))
  return { saleDate: d, saleDateDisplay }
}

function scheduleFromMonthDayYear(
  monthName: string,
  day: number,
  year: number,
  display?: string
): AuctionSchedule | null {
  const month = MONTHS[monthName.toLowerCase()]
  if (!month || !Number.isFinite(day) || !Number.isFinite(year)) return null
  const saleDate = `${year}-${pad2(month)}-${pad2(day)}`
  const saleDateDisplay =
    display?.trim() ||
    new Date(`${saleDate}T12:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  return { saleDate, saleDateDisplay }
}

function parseAuctionScheduleText(raw: string): AuctionSchedule | null {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (!text) return null

  const isoPrefix = text.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoPrefix) return scheduleFromIsoDate(isoPrefix[1], text)

  const monthDayYear = text.match(
    /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i
  )
  if (monthDayYear) {
    return scheduleFromMonthDayYear(
      monthDayYear[1],
      Number(monthDayYear[2]),
      Number(monthDayYear[3]),
      text
    )
  }

  return null
}

function parseCatalogAuctionSchedule(html: string): AuctionSchedule | null {
  const time = html.match(
    /<time\s+datetime="([^"]+)"[^>]*>([^<]*)<\/time>/i
  )
  if (time) {
    const iso = time[1].trim().slice(0, 10)
    return scheduleFromIsoDate(iso, time[2].trim())
  }
  return parseAuctionScheduleFromHtml(html)
}

function parseAuctionScheduleFromHtml(html: string): AuctionSchedule | null {
  const auctionInfo = html.match(
    /Auction Info:\s*<\/span>\s*([^<]+?)(?:<\/li>|<\/)/i
  )
  if (auctionInfo) {
    const parsed = parseAuctionScheduleText(auctionInfo[1])
    if (parsed) return parsed
  }

  const monthDate = html.match(/([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})/)
  if (monthDate) {
    return scheduleFromMonthDayYear(
      monthDate[1],
      Number(monthDate[2]),
      Number(monthDate[3])
    )
  }

  return null
}

function parseAuctionsIndexSchedules(
  html: string
): Map<string, { title: string; schedule: AuctionSchedule | null }> {
  const map = new Map<string, { title: string; schedule: AuctionSchedule | null }>()
  const parts = html.split(/<h2><a href="\/listings\/auction\/(\d+)">/i)
  for (let i = 1; i < parts.length; i += 2) {
    const auctionId = parts[i]
    const rest = parts[i + 1] ?? ''
    const title = rest.match(/^([^<]+)<\/a>/i)?.[1]?.replace(/\s+/g, ' ').trim() ?? ''
    const schedule = parseAuctionScheduleFromHtml(rest.slice(0, 6000))
    map.set(auctionId, { title, schedule })
  }
  return map
}

function parseCatalogLotLinks(
  html: string
): Map<string, { lotId: string; lotUrl: string }> {
  const byLotNumber = new Map<string, { lotId: string; lotUrl: string }>()
  const re =
    /\/lot\/show\/id\/(\d+)"[^>]*aria-label="Lot\s+(\d+)[^"]*"/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const lotId = m[1]
    const lotNumber = m[2]
    byLotNumber.set(lotNumber, {
      lotId,
      lotUrl: `${ORIGIN}/lot/show/id/${lotId}`,
    })
  }
  return byLotNumber
}

function parseLotNumberFromHtml(html: string, lotId: string): string {
  const heading = html.match(
    /<h1[^>]*id=['"]lot_heading['"][^>]*>\s*Lot\s+(\d+)/i
  )?.[1]
  if (heading) return heading

  const title = html.match(/<title>[^:]*Lot\s+(\d+)/i)?.[1]
  if (title) return title

  return lotId
}

function parseMoney(value: string): number | null {
  const n = parseFloat(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

function countyKeyFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function titleCaseCounty(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/** Match a county from a short field (CSV County col), township, or single-county label. */
function countyFromSource(text: string): { name: string; key: string } | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const targetKey = normalizeMichiganCountyKey(trimmed.replace(/\s+county$/i, ''))
  if (targetKey) {
    const info = MI_TARGET_COUNTIES.find(c => c.key === targetKey)
    if (info) return { name: info.name, key: targetKey }
  }

  // tax-sale.info CSV County column: single-token values (arenac, gladwin, allegan, …)
  const bare = trimmed.replace(/\s+county$/i, '').trim()
  if (/^[a-z]{3,}$/i.test(bare)) {
    const slug = bare.toLowerCase()
    if (slug !== 'dnr' && slug !== 'mi' && slug !== 'tba') {
      const name = titleCaseCounty(bare)
      return { name, key: countyKeyFromName(name) }
    }
  }

  const sorted = [...MI_TARGET_COUNTIES].sort((a, b) => b.name.length - a.name.length)
  for (const c of sorted) {
    const pattern = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
    if (new RegExp(`\\b${pattern}\\b`, 'i').test(trimmed)) {
      return { name: c.name, key: c.key }
    }
  }

  return null
}

function countiesInAuctionGroup(auctionTitle: string): string[] {
  return auctionTitle
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0 && !/^DNR$/i.test(part))
}

function resolveCountyForListing(params: {
  countyField?: string | null
  localUnit?: string | null
  address?: string | null
  lotTitle?: string | null
  auctionGroup: string
  catalogName?: string | null
}): { name: string; key: string } | null {
  if (params.countyField) {
    const fromField = countyFromSource(params.countyField)
    if (fromField) return fromField
  }

  if (params.localUnit) {
    const fromUnit = countyFromSource(params.localUnit)
    if (fromUnit) return fromUnit
  }

  if (params.catalogName && !/DNR/i.test(params.catalogName)) {
    const fromCatalog = countyFromSource(params.catalogName.replace(/\s+DNR$/i, ''))
    if (fromCatalog) return fromCatalog
  }

  if (params.lotTitle) {
    const subtitle = params.lotTitle
      .replace(/^Lot\s+\d+:\s*/i, '')
      .replace(/\s+Preview$/i, '')
      .trim()
    const subtitleBase = subtitle.replace(/\s+DNR$/i, '').trim()
    const fromTitle = countyFromSource(subtitleBase)
    if (fromTitle && (!subtitleBase.includes(' ') || fromTitle.name.toLowerCase() === subtitleBase.toLowerCase())) {
      return fromTitle
    }
  }

  const groupParts = countiesInAuctionGroup(params.auctionGroup)

  if (params.address && groupParts.length > 0) {
    for (const part of groupParts) {
      const candidate = countyFromSource(part)
      if (!candidate) continue
      const pattern = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (new RegExp(`\\b${pattern}\\b`, 'i').test(params.address)) {
        return candidate
      }
    }
  }

  if (params.address) {
    const fromAddress = countyFromSource(params.address)
    if (fromAddress) return fromAddress
  }

  if (groupParts.length === 1) {
    return countyFromSource(groupParts[0])
  }

  return null
}

function auctionMatchesTargets(title: string): boolean {
  const t = title.toLowerCase()
  return TARGET_NAMES.some(name => t.includes(name.toLowerCase()))
}

function parseAuctionBlocks(html: string): { auctionId: string; title: string }[] {
  const blocks: { auctionId: string; title: string }[] = []
  const re = /<h2><a href="\/listings\/auction\/(\d+)">([^<]+)<\/a><\/h2>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const title = m[2].replace(/\s+/g, ' ').trim()
    if (auctionMatchesTargets(title)) {
      blocks.push({ auctionId: m[1], title })
    }
  }
  return blocks
}

function parseLotsFromAuctionHtml(
  html: string,
  auctionId: string,
  auctionTitle: string
): { lotId: string; minBid: number | null }[] {
  const lots: { lotId: string; minBid: number | null }[] = []
  const re =
    /href="\/lot\/show\/id\/(\d+)"[\s\S]*?Minimum Bid:\s*\$([^<]+)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    lots.push({ lotId: m[1], minBid: parseMoney(m[2]) })
  }
  if (lots.length > 0) return lots

  const ids = [...html.matchAll(/href="\/lot\/show\/id\/(\d+)"/gi)].map(x => x[1])
  const unique = [...new Set(ids)]
  return unique.map(lotId => ({ lotId, minBid: null }))
}

function parseLotDetail(
  html: string,
  lotId: string,
  fallbackSchedule?: AuctionSchedule | null
): {
  localUnit: string | null
  address: string
  parcelId: string
  lotNumber: string
  openingBid: number | null
  title: string
  schedule: AuctionSchedule
} {
  const title =
    html.match(/<title>Lot[^:]*:[^<]+<\/title>/i)?.[0]?.replace(/<\/?title>/gi, '') ??
    html.match(/<h1[^>]*id=['"]lot_heading['"][^>]*>([^<]+)/i)?.[1] ??
    ''

  const localUnit =
    html.match(/<b>\s*Local Unit\s*<\/b>\s*([^<]+)/i)?.[1]?.trim() ??
    html.match(/Local Unit[^:]*:\s*<\/[^>]+>\s*([^<]+)/i)?.[1]?.trim() ??
    null

  const minBid =
    parseMoney(
      html.match(/Minimum Bid:\s*\$?([\d,]+\.?\d*)/i)?.[1] ?? ''
    ) ?? null

  const parcelId =
    html.match(/Parcel ID:\s*<\/b>\s*([^<]+)/i)?.[1]?.trim() ??
    html.match(/<b>Parcel ID:\s*<\/b>\s*([^<]+)/i)?.[1]?.trim() ??
    '—'

  const address =
    html.match(/<b>\s*Address:\s*<\/b>\s*([^<]+)/i)?.[1]?.trim() ??
    html.match(/Address:<\/span>\s*([^<]+)/i)?.[1]?.trim() ??
    (title.replace(/^Lot\s+\d+:\s*/i, '').trim() || 'Address not available')

  const schedule =
    parseAuctionScheduleFromHtml(html) ??
    fallbackSchedule ?? {
      saleDate: '—',
      saleDateDisplay: '—',
    }

  return {
    localUnit,
    address,
    parcelId,
    lotNumber: parseLotNumberFromHtml(html, lotId),
    openingBid: minBid,
    title: title.trim(),
    schedule,
  }
}

/** Parse tax-sale.info CSV export (catalog/getCsv). */
function parseCatalogCsv(
  csv: string,
  catalogCounty: string,
  catalogId: string,
  schedule: AuctionSchedule,
  lotLinks: Map<string, { lotId: string; lotUrl: string }>
): TaxSaleListing[] {
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const listings: TaxSaleListing[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    const cols = parseCsvLine(line)
    if (cols.length < 6) continue

    const lotNumber = cols[0]?.replace(/"/g, '').trim()
    const minBid = parseMoney(cols[1]?.replace(/"/g, '') ?? '')
    const parcelId = cols[3]?.replace(/"/g, '').trim() ?? '—'
    const countyCol = cols[4]?.replace(/"/g, '').trim() ?? ''
    const address = cols[5]?.replace(/"/g, '').trim() ?? 'Address not available'
    const localUnit = cols[6]?.replace(/"/g, '').trim() ?? ''

    const county = resolveCountyForListing({
      countyField: countyCol,
      localUnit,
      address,
      auctionGroup: catalogCounty,
      catalogName: catalogCounty,
    })
    if (!county) continue

    const link = lotLinks.get(lotNumber)
    const id = `taxsale-csv-${county.key}-${parcelId}-${lotNumber}`
    listings.push({
      id,
      county: county.name,
      countyKey: county.key,
      state: 'MI',
      address,
      lotNumber,
      parcelId,
      openingBid: minBid,
      saleDate: schedule.saleDate,
      saleDateDisplay: schedule.saleDateDisplay,
      auctionGroup: catalogCounty,
      auctionUrl: `${ORIGIN}/listings/catalog/${catalogId}`,
      lotUrl: link?.lotUrl ?? `${ORIGIN}/listings/catalog/${catalogId}`,
      source: 'catalog-csv',
    })
  }

  return listings
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: FETCH_HEADERS, cache: 'no-store' })
  if (!res.ok) throw new Error(`tax-sale.info fetch failed (${res.status}): ${url}`)
  return res.text()
}

async function mapLot(
  lotId: string,
  minBidFromPage: number | null,
  auctionId: string,
  auctionTitle: string,
  fallbackSchedule?: AuctionSchedule | null,
  catalogName?: string | null
): Promise<TaxSaleListing | null> {
  const html = await fetchText(`${ORIGIN}/lot/show/id/${lotId}`)
  const detail = parseLotDetail(html, lotId, fallbackSchedule)
  const county = resolveCountyForListing({
    localUnit: detail.localUnit,
    address: detail.address,
    lotTitle: detail.title,
    auctionGroup: auctionTitle,
    catalogName,
  })
  if (!county) return null

  const openingBid = detail.openingBid ?? minBidFromPage
  return {
    id: `taxsale-lot-${lotId}`,
    county: county.name,
    countyKey: county.key as MichiganTargetCountyKey,
    state: 'MI',
    address: detail.address,
    lotNumber: detail.lotNumber,
    parcelId: detail.parcelId,
    openingBid,
    saleDate: detail.schedule.saleDate,
    saleDateDisplay: detail.schedule.saleDateDisplay,
    auctionGroup: auctionTitle,
    auctionUrl: `${ORIGIN}/listings/auction/${auctionId}`,
    lotUrl: `${ORIGIN}/lot/show/id/${lotId}`,
    source: 'auction-page',
  }
}

async function fetchAuctionListings(
  auctionId: string,
  auctionTitle: string,
  indexSchedule?: AuctionSchedule | null
): Promise<TaxSaleListing[]> {
  const html = await fetchText(`${ORIGIN}/listings/auction/${auctionId}`)
  const pageSchedule = parseAuctionScheduleFromHtml(html) ?? indexSchedule ?? null
  const lots = parseLotsFromAuctionHtml(html, auctionId, auctionTitle)
  const results: TaxSaleListing[] = []
  const lotIdsFromCatalog = new Set<string>()

  const catalogRe = /href="\/listings\/catalog\/(\d+)">([^<]+)<\/a>/gi
  let cm: RegExpExecArray | null
  while ((cm = catalogRe.exec(html)) !== null) {
    const catalogId = cm[1]
    const catalogName = cm[2].trim()
    if (/DNR/i.test(catalogName)) continue
    try {
      const catalogHtml = await fetchText(`${ORIGIN}/listings/catalog/${catalogId}`)
      const catalogSchedule =
        parseCatalogAuctionSchedule(catalogHtml) ?? pageSchedule
      if (!catalogSchedule) continue
      const lotLinks = parseCatalogLotLinks(catalogHtml)
      const csv = await fetchText(`${ORIGIN}/catalog/getCsv/id/${catalogId}`)
      const csvRows = parseCatalogCsv(
        csv,
        catalogName,
        catalogId,
        catalogSchedule,
        lotLinks
      )
      for (const row of csvRows) {
        results.push(row)
        const lotId = lotLinks.get(row.lotNumber)?.lotId
        if (lotId) lotIdsFromCatalog.add(lotId)
      }
    } catch {
      /* catalog may be gated until login */
    }
  }

  const batchSize = 6
  for (let i = 0; i < lots.length; i += batchSize) {
    const chunk = lots.slice(i, i + batchSize).filter(l => !lotIdsFromCatalog.has(l.lotId))
    if (!chunk.length) continue
    const mapped = await Promise.all(
      chunk.map(l => mapLot(l.lotId, l.minBid, auctionId, auctionTitle, pageSchedule))
    )
    for (const row of mapped) {
      if (row) results.push(row)
    }
  }

  return results
}

export async function fetchTaxSaleInfoListings(): Promise<{
  listings: TaxSaleListing[]
  auctionGroups: string[]
}> {
  const indexHtml = await fetchText(TAX_SALE_AUCTIONS_URL)
  const auctions = parseAuctionBlocks(indexHtml)
  const indexSchedules = parseAuctionsIndexSchedules(indexHtml)
  const byId = new Map<string, TaxSaleListing>()

  for (const { auctionId, title } of auctions) {
    try {
      const schedule = indexSchedules.get(auctionId)?.schedule ?? null
      const rows = await fetchAuctionListings(auctionId, title, schedule)
      for (const row of rows) {
        byId.set(row.id, row)
      }
    } catch {
      /* skip failed auction group */
    }
  }

  const listings = [...byId.values()].sort((a, b) => {
    if (a.county !== b.county) return a.county.localeCompare(b.county)
    return a.address.localeCompare(b.address)
  })

  return {
    listings,
    auctionGroups: auctions.map(a => a.title),
  }
}

export function filterUpcomingTaxSaleListings(listings: TaxSaleListing[]): TaxSaleListing[] {
  return listings.filter(l => {
    if (l.saleDate === '—') return true
    return isUpcomingSale(l.saleDate)
  })
}
