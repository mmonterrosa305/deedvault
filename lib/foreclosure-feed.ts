import {
  isForeclosureListing,
  isTaxDeedListing,
  listingTypeLabel,
  type ForeclosureListing,
} from '@/lib/foreclosure-listing'
import type { RealForecloseListing } from '@/lib/realforeclose'

export type {
  LiveDataFilterState as ForeclosureFilterState,
  LiveDataSort as ForeclosureSort,
  LiveDataStateFilter as ForeclosureStateFilter,
} from '@/lib/live-data-feed'

export {
  LIVE_DATA_MAX_OPENING_BID as FORECLOSURE_MAX_OPENING_BID,
  LIVE_DATA_MAX_RATIO_PCT as FORECLOSURE_MAX_RATIO_PCT,
  LIVE_DATA_GOOD_DEAL_RATIO_PCT as FORECLOSURE_GOOD_DEAL_RATIO_PCT,
  defaultLiveDataFilters as defaultForeclosureFilters,
  bidToAssessedRatio,
  formatBidToAssessedPct,
  isGoodDealRatio,
} from '@/lib/live-data-feed'

import {
  bidToAssessedRatio,
  defaultLiveDataFilters,
  type LiveDataFilterState,
} from '@/lib/live-data-feed'

export function realForecloseToAuctionListing(row: RealForecloseListing): ForeclosureListing {
  return {
    id: `fc-${row.id}`,
    category: 'auction',
    county: row.county,
    countyKey: row.countyKey,
    state: 'FL',
    address: row.address,
    caseNumber: row.caseNumber,
    parcelId: row.parcelId,
    openingBid: row.openingBid,
    estimatedValue: row.assessedValue,
    eventDate: row.auctionDate,
    eventDateDisplay: row.auctionDateTime,
    auctionType: row.auctionType,
    sourceUrl: row.auctionUrl,
    sourceLabel: 'RealForeclose',
  }
}

export function listingOpeningBid(listing: ForeclosureListing): number | null {
  return listing.openingBid
}

export function listingEstimatedValue(listing: ForeclosureListing): number | null {
  return listing.estimatedValue
}

export function listingBidToAssessedRatio(listing: ForeclosureListing): number | null {
  return bidToAssessedRatio(listing.openingBid, listing.estimatedValue)
}

export function collectForeclosureCounties(listings: ForeclosureListing[]): string[] {
  const set = new Set<string>()
  for (const row of listings) set.add(row.county)
  return [...set].sort((a, b) => a.localeCompare(b))
}

function compareListings(
  a: ForeclosureListing,
  b: ForeclosureListing,
  sort: LiveDataFilterState['sort']
): number {
  if (sort === 'bid-asc') {
    const bidA = listingOpeningBid(a)
    const bidB = listingOpeningBid(b)
    if (bidA == null && bidB == null) return 0
    if (bidA == null) return 1
    if (bidB == null) return -1
    if (bidA !== bidB) return bidA - bidB
  }

  if (sort === 'ratio-asc') {
    const ratioA = listingBidToAssessedRatio(a)
    const ratioB = listingBidToAssessedRatio(b)
    if (ratioA == null && ratioB == null) return 0
    if (ratioA == null) return 1
    if (ratioB == null) return -1
    if (ratioA !== ratioB) return ratioA - ratioB
  }

  const dateA = Date.parse(a.eventDate)
  const dateB = Date.parse(b.eventDate)
  if (!Number.isNaN(dateA) && !Number.isNaN(dateB) && dateA !== dateB) return dateA - dateB
  if (a.county !== b.county) return a.county.localeCompare(b.county)
  return a.caseNumber.localeCompare(b.caseNumber)
}

function passesFilters(listing: ForeclosureListing, filters: LiveDataFilterState): boolean {
  if (filters.state !== 'all' && listing.state !== filters.state) return false
  if (filters.county && listing.county !== filters.county) return false

  const bid = listingOpeningBid(listing)
  if (bid != null && bid > filters.maxOpeningBid) return false

  const ratio = listingBidToAssessedRatio(listing)
  if (ratio != null && ratio > filters.maxBidToAssessedPct) return false

  return true
}

function matchesSearch(listing: ForeclosureListing, q: string): boolean {
  const lq = q.toLowerCase()
  return (
    listing.county.toLowerCase().includes(lq) ||
    listing.caseNumber.toLowerCase().includes(lq) ||
    listing.parcelId.toLowerCase().includes(lq) ||
    listing.address.toLowerCase().includes(lq) ||
    (listingTypeLabel(listing)?.toLowerCase().includes(lq) ?? false) ||
    (listing.auctionType?.toLowerCase().includes(lq) ?? false) ||
    listing.eventDateDisplay.toLowerCase().includes(lq) ||
    listing.sourceLabel.toLowerCase().includes(lq)
  )
}

/** Foreclosures tab: mortgage / lis pendens / pre-foreclosure only. */
export function filterForeclosureTabListings(
  listings: ForeclosureListing[]
): ForeclosureListing[] {
  return listings.filter(isForeclosureListing)
}

/** Tax Deeds tab: Michigan tax-sale / Wayne / other TAXDEED rows from foreclosure-shaped APIs. */
export function filterTaxDeedTabListings(
  listings: ForeclosureListing[]
): ForeclosureListing[] {
  return listings.filter(isTaxDeedListing)
}

export function filterAndSortForeclosureListings(
  listings: ForeclosureListing[],
  filters: LiveDataFilterState,
  searchQuery: string
): ForeclosureListing[] {
  const q = searchQuery.trim()
  let result = listings.filter(row => {
    if (q && !matchesSearch(row, q)) return false
    return passesFilters(row, filters)
  })
  result = [...result].sort((a, b) => compareListings(a, b, filters.sort))
  return result
}

export { defaultLiveDataFilters }
