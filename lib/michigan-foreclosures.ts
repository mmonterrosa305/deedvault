/**
 * Aggregates Michigan tax deed / forfeiture auction listings for the Foreclosures tab.
 */

import type { Bid4AssetsListing } from '@/lib/bid4assets'
import { fetchMichiganBid4AssetsListings } from '@/lib/bid4assets'
import {
  SALE_KIND_TAXDEED,
  type ForeclosureListing,
} from '@/lib/foreclosure-listing'
import { MI_TARGET_COUNTIES } from '@/lib/michigan-counties'
import type { SriListing } from '@/lib/sri'
import { fetchMichiganSriListings } from '@/lib/sri'
import {
  fetchTaxSaleInfoListings,
  filterUpcomingTaxSaleListings,
  type TaxSaleListing,
} from '@/lib/tax-sale-info'
import {
  fetchWayneCountyAuctionListings,
  type WayneAuctionListing,
} from '@/lib/wayne-county-auction'

export type MichiganSourceCounts = {
  bid4assets: number
  sri: number
  wayne: number
  taxSaleInfo: number
  total: number
}

export type MichiganForeclosureFetchResult = {
  listings: ForeclosureListing[]
  sourceCounts: MichiganSourceCounts
  warnings: string[]
  wayneCatalogTotal: number
  taxSaleAuctionGroups: string[]
}

function bid4AssetsToListing(row: Bid4AssetsListing): ForeclosureListing {
  return {
    id: `mi-b4a-${row.id}`,
    category: 'auction',
    county: row.county,
    countyKey: row.countyKey,
    state: 'MI',
    address: row.address,
    caseNumber: row.auctionTitle ?? row.id,
    parcelId: '—',
    openingBid: row.openingBid,
    estimatedValue: null,
    eventDate: row.saleDate,
    eventDateDisplay: row.saleDate,
    auctionType: SALE_KIND_TAXDEED,
    auctionSubtype: row.source === 'calendar' ? 'Scheduled auction' : 'Tax deed auction',
    sourceUrl: row.auctionUrl ?? 'https://www.bid4assets.com/taxsale',
    sourceLabel: 'Bid4Assets',
  }
}

function sriToListing(row: SriListing): ForeclosureListing {
  return {
    id: `mi-sri-${row.id}`,
    category: 'auction',
    county: row.county,
    countyKey: row.countyKey,
    state: 'MI',
    address: row.address,
    caseNumber: row.parcelNumber ?? row.id,
    parcelId: row.parcelNumber ?? '—',
    openingBid: row.openingBid,
    estimatedValue: null,
    eventDate: row.saleDate,
    eventDateDisplay: row.saleDate,
    auctionType: SALE_KIND_TAXDEED,
    auctionSubtype: row.saleType ?? 'Tax deed',
    sourceUrl: row.auctionUrl,
    sourceLabel: 'SRI',
  }
}

function wayneToListing(row: WayneAuctionListing): ForeclosureListing {
  return {
    id: `mi-wayne-${row.id}`,
    category: 'auction',
    county: row.county,
    countyKey: row.countyKey,
    state: 'MI',
    address: row.address,
    caseNumber: row.auctionItemId,
    parcelId: row.parcelId,
    openingBid: row.openingBid,
    estimatedValue: null,
    eventDate: row.saleDate,
    eventDateDisplay: row.saleDateDisplay,
    auctionType: SALE_KIND_TAXDEED,
    auctionSubtype: `Tax foreclosure · ${row.statusCode}`,
    sourceUrl: row.auctionUrl,
    sourceLabel: 'Wayne Treasurer',
  }
}

function taxSaleToListing(row: TaxSaleListing): ForeclosureListing {
  const caseNumber =
    row.lotNumber && row.lotNumber !== '—'
      ? `Lot ${row.lotNumber}`
      : row.parcelId !== '—'
        ? row.parcelId
        : row.id

  return {
    id: `mi-taxsale-${row.id}`,
    category: 'auction',
    county: row.county,
    countyKey: row.countyKey,
    state: 'MI',
    address: row.address,
    caseNumber,
    parcelId: row.parcelId,
    openingBid: row.openingBid,
    estimatedValue: null,
    eventDate: row.saleDate,
    eventDateDisplay: row.saleDateDisplay,
    auctionType: SALE_KIND_TAXDEED,
    auctionSubtype: `Tax forfeiture · ${row.auctionGroup}`,
    sourceUrl: row.lotUrl,
    sourceLabel: 'tax-sale.info',
  }
}

function dedupeListings(listings: ForeclosureListing[]): ForeclosureListing[] {
  const byKey = new Map<string, ForeclosureListing>()
  for (const row of listings) {
    const key = [
      row.countyKey,
      row.parcelId.toLowerCase(),
      row.address.toLowerCase().slice(0, 40),
      String(row.openingBid ?? ''),
    ].join('|')
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, row)
      continue
    }
    const prefer =
      row.sourceLabel === 'Wayne Treasurer' ||
      (existing.sourceLabel !== 'Wayne Treasurer' && row.openingBid != null)
    if (prefer) byKey.set(key, row)
  }
  return [...byKey.values()]
}

export async function fetchMichiganForeclosureListings(): Promise<MichiganForeclosureFetchResult> {
  const warnings: string[] = []
  const all: ForeclosureListing[] = []

  let bid4Count = 0
  let sriCount = 0
  let wayneCount = 0
  let taxSaleCount = 0
  let wayneCatalogTotal = 0
  let taxSaleAuctionGroups: string[] = []

  const [bid4, sri, wayne, taxSale] = await Promise.all([
    fetchMichiganBid4AssetsListings().catch(err => {
      warnings.push(
        err instanceof Error ? err.message : 'Bid4Assets Michigan fetch failed'
      )
      return null
    }),
    fetchMichiganSriListings().catch(err => {
      warnings.push(err instanceof Error ? err.message : 'SRI Michigan fetch failed')
      return null
    }),
    fetchWayneCountyAuctionListings({ activeOnly: true }).catch(err => {
      warnings.push(
        err instanceof Error ? err.message : 'Wayne County auction fetch failed'
      )
      return null
    }),
    fetchTaxSaleInfoListings().catch(err => {
      warnings.push(
        err instanceof Error ? err.message : 'tax-sale.info fetch failed'
      )
      return null
    }),
  ])

  if (bid4) {
    for (const row of bid4.listings) {
      if (MI_TARGET_COUNTIES.some(c => c.key === row.countyKey)) {
        all.push(bid4AssetsToListing(row))
      }
    }
    bid4Count = all.filter(l => l.sourceLabel === 'Bid4Assets').length
  }

  if (sri) {
    const before = all.length
    for (const row of sri.listings) {
      if (MI_TARGET_COUNTIES.some(c => c.key === row.countyKey)) {
        all.push(sriToListing(row))
      }
    }
    sriCount = all.length - before
  }

  if (wayne) {
    wayneCatalogTotal = wayne.totalInCatalog
    if (wayne.listings.length === 0 && wayne.activeCount === 0) {
      warnings.push(
        `Wayne County: ${wayne.totalInCatalog} parcels in catalog; no active online lots right now (check waynecountytreasurermi.com).`
      )
    }
    for (const row of wayne.listings) {
      all.push(wayneToListing(row))
    }
    wayneCount = wayne.listings.length
  }

  if (taxSale) {
    taxSaleAuctionGroups = taxSale.auctionGroups
    const upcoming = filterUpcomingTaxSaleListings(taxSale.listings)
    const before = all.length
    for (const row of upcoming) {
      all.push(taxSaleToListing(row))
    }
    taxSaleCount = all.length - before
  }

  const listings = dedupeListings(all)

  return {
    listings,
    sourceCounts: {
      bid4assets: bid4Count,
      sri: sriCount,
      wayne: wayneCount,
      taxSaleInfo: taxSaleCount,
      total: listings.length,
    },
    warnings,
    wayneCatalogTotal,
    taxSaleAuctionGroups,
  }
}
