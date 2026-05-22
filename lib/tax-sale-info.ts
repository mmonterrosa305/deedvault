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
  parcelId: string
  openingBid: number | null
  saleDate: string
  saleDateDisplay: string
  auctionGroup: string
  auctionUrl: string
  lotUrl: string
  source: 'auction-page' | 'catalog-csv'
}

function parseMoney(value: string): number | null {
  const n = parseFloat(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

function countyFromText(text: string): { name: string; key: string } | null {
  const lower = text.toLowerCase()
  for (const c of MI_TARGET_COUNTIES) {
    if (lower.includes(c.name.toLowerCase())) {
      return { name: c.name, key: c.key }
    }
  }
  const key = normalizeMichiganCountyKey(text)
  if (!key) return null
  const info = MI_TARGET_COUNTIES.find(c => c.key === key)
  return info ? { name: info.name, key: info.key } : null
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

function parseLotDetail(html: string, lotId: string): {
  county: { name: string; key: string } | null
  address: string
  parcelId: string
  openingBid: number | null
  title: string
} {
  const title =
    html.match(/<title>Lot[^:]*:[^<]+<\/title>/i)?.[0]?.replace(/<\/?title>/gi, '') ??
    html.match(/<h1[^>]*id=['"]lot_heading['"][^>]*>([^<]+)/i)?.[1] ??
    ''

  const county = countyFromText(title) ?? countyFromText(html)

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

  return { county, address, parcelId, openingBid: minBid, title: title.trim() }
}

/** Parse tax-sale.info CSV export (catalog/getCsv). */
function parseCatalogCsv(csv: string, catalogCounty: string): TaxSaleListing[] {
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
    const countyCol = cols[4]?.replace(/"/g, '').trim() ?? catalogCounty
    const address = cols[5]?.replace(/"/g, '').trim() ?? 'Address not available'

    const county = countyFromText(countyCol) ?? countyFromText(catalogCounty)
    if (!county) continue

    const id = `taxsale-csv-${county.key}-${parcelId}-${lotNumber}`
    listings.push({
      id,
      county: county.name,
      countyKey: county.key,
      state: 'MI',
      address,
      parcelId,
      openingBid: minBid,
      saleDate: '—',
      saleDateDisplay: 'See tax-sale.info auction schedule',
      auctionGroup: catalogCounty,
      auctionUrl: TAX_SALE_AUCTIONS_URL,
      lotUrl: TAX_SALE_AUCTIONS_URL,
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
  auctionTitle: string
): Promise<TaxSaleListing | null> {
  const html = await fetchText(`${ORIGIN}/lot/show/id/${lotId}`)
  const detail = parseLotDetail(html, lotId)
  const county =
    detail.county ??
    countyFromText(auctionTitle) ??
    null
  if (!county) return null

  const openingBid = detail.openingBid ?? minBidFromPage
  return {
    id: `taxsale-lot-${lotId}`,
    county: county.name,
    countyKey: county.key as MichiganTargetCountyKey,
    state: 'MI',
    address: detail.address,
    parcelId: detail.parcelId,
    openingBid,
    saleDate: '—',
    saleDateDisplay: auctionTitle,
    auctionGroup: auctionTitle,
    auctionUrl: `${ORIGIN}/listings/auction/${auctionId}`,
    lotUrl: `${ORIGIN}/lot/show/id/${lotId}`,
    source: 'auction-page',
  }
}

async function fetchAuctionListings(
  auctionId: string,
  auctionTitle: string
): Promise<TaxSaleListing[]> {
  const html = await fetchText(`${ORIGIN}/listings/auction/${auctionId}`)
  const lots = parseLotsFromAuctionHtml(html, auctionId, auctionTitle)
  const results: TaxSaleListing[] = []

  const batchSize = 6
  for (let i = 0; i < lots.length; i += batchSize) {
    const chunk = lots.slice(i, i + batchSize)
    const mapped = await Promise.all(
      chunk.map(l => mapLot(l.lotId, l.minBid, auctionId, auctionTitle))
    )
    for (const row of mapped) {
      if (row) results.push(row)
    }
  }

  const catalogRe = /href="\/listings\/catalog\/(\d+)">([^<]+)<\/a>/gi
  let cm: RegExpExecArray | null
  while ((cm = catalogRe.exec(html)) !== null) {
    const catalogId = cm[1]
    const catalogName = cm[2].trim()
    if (/DNR/i.test(catalogName)) continue
    const county = countyFromText(catalogName)
    if (!county) continue
    try {
      const csv = await fetchText(`${ORIGIN}/catalog/getCsv/id/${catalogId}`)
      results.push(...parseCatalogCsv(csv, catalogName))
    } catch {
      /* catalog may be gated until login */
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
  const byId = new Map<string, TaxSaleListing>()

  for (const { auctionId, title } of auctions) {
    try {
      const rows = await fetchAuctionListings(auctionId, title)
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
