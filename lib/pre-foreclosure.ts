import { SALE_KIND_FORECLOSURE, type ForeclosureListing } from '@/lib/foreclosure-listing'
import type { RealForecloseListing } from '@/lib/realforeclose'
import { searchMiamiDadeClerkRecords } from '@/lib/miami-dade-clerk-records'

const NOTICE_DOC = 'NOTICE - NOT'
const LIS_PENDENS_DOC = 'LIS PENDENS - LIS'

function normalizeCaseKey(caseNumber: string): string {
  return caseNumber.replace(/\s+/g, '').toUpperCase()
}

function realForecloseToPreForeclosure(row: RealForecloseListing): ForeclosureListing {
  const auctionMs = Date.parse(row.auctionDate)
  const daysOut = Number.isNaN(auctionMs)
    ? 0
    : Math.floor((auctionMs - Date.now()) / (24 * 60 * 60 * 1000))

  return {
    id: `pf-rf-${row.id}`,
    category: 'pre-foreclosure',
    county: row.county,
    countyKey: row.countyKey,
    state: 'FL',
    address: row.address,
    caseNumber: row.caseNumber,
    parcelId: row.parcelId,
    openingBid: row.openingBid,
    estimatedValue: row.assessedValue,
    eventDate: row.auctionDate,
    eventDateDisplay: `${row.auctionDateTime} (${daysOut} days out)`,
    auctionType: SALE_KIND_FORECLOSURE,
    auctionSubtype: row.auctionType,
    sourceUrl: row.auctionUrl,
    sourceLabel: 'RealForeclose (scheduled auction)',
  }
}

/**
 * Pre-foreclosures: recent NOTICE / LIS PENDENS clerk filings in Miami-Dade,
 * excluding cases already on the foreclosure auction calendar.
 */
export async function fetchPreForeclosures(
  scheduledAuctions: RealForecloseListing[]
): Promise<{ listings: ForeclosureListing[]; warning?: string }> {
  const auctionCases = new Set(
    scheduledAuctions
      .map(a => normalizeCaseKey(a.caseNumber))
      .filter(k => k && k !== '—')
  )

  const warnings: string[] = []
  const byId = new Map<string, ForeclosureListing>()

  for (const docType of [LIS_PENDENS_DOC, NOTICE_DOC]) {
    const result = await searchMiamiDadeClerkRecords({
      documentType: docType,
      category: 'pre-foreclosure',
      idPrefix: `pf-${docType.includes('LIS') ? 'lis' : 'ntc'}`,
    })
    if (result.warning) warnings.push(result.warning)
    for (const row of result.listings) {
      const key = normalizeCaseKey(row.caseNumber)
      if (key && key !== '—' && auctionCases.has(key)) continue
      byId.set(row.id, row)
    }
  }

  // Free public fallback: scheduled auctions 45+ days out (early pipeline stage).
  if (byId.size === 0) {
    const cutoff = Date.now() + 45 * 24 * 60 * 60 * 1000
    for (const auction of scheduledAuctions) {
      const ms = Date.parse(auction.auctionDate)
      if (!Number.isNaN(ms) && ms >= cutoff) {
        const row = realForecloseToPreForeclosure(auction)
        byId.set(row.id, row)
      }
    }
    if (byId.size > 0) {
      warnings.push(
        'Clerk pre-foreclosure search unavailable; showing RealForeclose auctions scheduled 45+ days out.'
      )
    }
  }

  const listings = [...byId.values()].sort((a, b) => {
    const da = Date.parse(a.eventDate)
    const db = Date.parse(b.eventDate)
    if (!Number.isNaN(da) && !Number.isNaN(db) && da !== db) return da - db
    return a.county.localeCompare(b.county)
  })

  return {
    listings,
    warning: warnings.length > 0 ? [...new Set(warnings)].join(' ') : undefined,
  }
}
