import type { Bid4AssetsListing } from '@/lib/bid4assets'
import type { GovEaseListing } from '@/lib/govease'
import type { LiveDataRecord } from '@/lib/live-data-merge'
import type { RealForecloseListing } from '@/lib/realforeclose'
import { caseUniqueId } from '@/lib/realtdm'
import type { SriListing } from '@/lib/sri'

export type LiveDataFeedItem =
  | { kind: 'realtdm'; record: LiveDataRecord }
  | { kind: 'govease'; listing: GovEaseListing }
  | { kind: 'bid4assets'; listing: Bid4AssetsListing }
  | { kind: 'sri'; listing: SriListing }
  | { kind: 'realforeclose'; listing: RealForecloseListing }

export type LiveDataSort = 'date' | 'bid-asc' | 'ratio-asc'
export type LiveDataStateFilter = 'all' | 'FL' | 'MI'

export type LiveDataFilterState = {
  maxOpeningBid: number
  maxBidToAssessedPct: number
  county: string
  state: LiveDataStateFilter
  sort: LiveDataSort
}

export const LIVE_DATA_MAX_OPENING_BID = 500_000
export const LIVE_DATA_MAX_RATIO_PCT = 100
export const LIVE_DATA_GOOD_DEAL_RATIO_PCT = 20

export const defaultLiveDataFilters: LiveDataFilterState = {
  maxOpeningBid: LIVE_DATA_MAX_OPENING_BID,
  maxBidToAssessedPct: LIVE_DATA_MAX_RATIO_PCT,
  county: '',
  state: 'all',
  sort: 'date',
}

export function feedItemKey(item: LiveDataFeedItem): string {
  if (item.kind === 'realtdm') return caseUniqueId(item.record.case)
  return item.listing.id
}

export function feedItemState(item: LiveDataFeedItem): 'FL' | 'MI' {
  if (item.kind === 'realtdm') return 'FL'
  return item.listing.state
}

export function feedItemCounty(item: LiveDataFeedItem): string {
  if (item.kind === 'realtdm') return item.record.case.county
  return item.listing.county
}

export function feedItemOpeningBid(item: LiveDataFeedItem): number | null {
  if (item.kind === 'realtdm') return item.record.case.openingBid
  return item.listing.openingBid
}

export function feedItemAssessedValue(item: LiveDataFeedItem): number | null {
  if (item.kind === 'realtdm') return item.record.assessedValue
  if (item.kind === 'realforeclose') return item.listing.assessedValue
  return null
}

/** Opening bid as a percentage of assessed value (0–100+), or null if unknown. */
export function bidToAssessedRatio(
  openingBid: number | null,
  assessedValue: number | null
): number | null {
  if (openingBid == null || assessedValue == null || assessedValue <= 0) return null
  return (openingBid / assessedValue) * 100
}

export function feedItemBidToAssessedRatio(item: LiveDataFeedItem): number | null {
  return bidToAssessedRatio(
    feedItemOpeningBid(item),
    feedItemAssessedValue(item)
  )
}

export function formatBidToAssessedPct(ratio: number): string {
  if (ratio < 10) return `${ratio.toFixed(1)}%`
  return `${Math.round(ratio)}%`
}

export function isGoodDealRatio(ratio: number | null): boolean {
  return ratio != null && ratio < LIVE_DATA_GOOD_DEAL_RATIO_PCT
}

function feedItemSortTime(item: LiveDataFeedItem): number {
  if (item.kind === 'realtdm') return Date.parse(item.record.case.saleDate)
  if (item.kind === 'realforeclose') return Date.parse(item.listing.auctionDate)
  return Date.parse(item.listing.saleDate)
}

function matchesSearch(item: LiveDataFeedItem, q: string): boolean {
  const lq = q.toLowerCase()
  if (item.kind === 'realtdm') {
    const r = item.record
    const c = r.case
    return (
      c.caseNumber.toLowerCase().includes(lq) ||
      c.county.toLowerCase().includes(lq) ||
      c.parcelNumber.toLowerCase().includes(lq) ||
      c.status.toLowerCase().includes(lq) ||
      r.displayAddress.toLowerCase().includes(lq) ||
      (r.displayOwner?.toLowerCase().includes(lq) ?? false)
    )
  }
  if (item.kind === 'govease') {
    const g = item.listing
    return (
      g.county.toLowerCase().includes(lq) ||
      g.address.toLowerCase().includes(lq) ||
      (g.parcelNumber?.toLowerCase().includes(lq) ?? false) ||
      (g.saleType?.toLowerCase().includes(lq) ?? false) ||
      g.saleDate.toLowerCase().includes(lq)
    )
  }
  if (item.kind === 'sri') {
    const s = item.listing
    return (
      s.county.toLowerCase().includes(lq) ||
      s.address.toLowerCase().includes(lq) ||
      (s.parcelNumber?.toLowerCase().includes(lq) ?? false) ||
      (s.saleType?.toLowerCase().includes(lq) ?? false) ||
      (s.saleStatus?.toLowerCase().includes(lq) ?? false) ||
      s.saleDate.toLowerCase().includes(lq) ||
      s.state.toLowerCase().includes(lq)
    )
  }
  if (item.kind === 'realforeclose') {
    const r = item.listing
    return (
      r.county.toLowerCase().includes(lq) ||
      r.caseNumber.toLowerCase().includes(lq) ||
      r.parcelId.toLowerCase().includes(lq) ||
      r.address.toLowerCase().includes(lq) ||
      r.auctionType.toLowerCase().includes(lq) ||
      r.auctionDateTime.toLowerCase().includes(lq) ||
      r.auctionDate.toLowerCase().includes(lq) ||
      r.state.toLowerCase().includes(lq) ||
      (r.certificateNumber?.toLowerCase().includes(lq) ?? false)
    )
  }
  const b = item.listing
  return (
    b.county.toLowerCase().includes(lq) ||
    b.address.toLowerCase().includes(lq) ||
    (b.auctionTitle?.toLowerCase().includes(lq) ?? false) ||
    b.saleDate.toLowerCase().includes(lq) ||
    b.state.toLowerCase().includes(lq)
  )
}

function passesFilters(item: LiveDataFeedItem, filters: LiveDataFilterState): boolean {
  if (filters.state !== 'all' && feedItemState(item) !== filters.state) return false
  if (filters.county && feedItemCounty(item) !== filters.county) return false

  const openingBid = feedItemOpeningBid(item)
  if (
    openingBid != null &&
    openingBid > filters.maxOpeningBid
  ) {
    return false
  }

  const ratio = feedItemBidToAssessedRatio(item)
  if (
    ratio != null &&
    ratio > filters.maxBidToAssessedPct
  ) {
    return false
  }

  return true
}

function compareFeedItems(a: LiveDataFeedItem, b: LiveDataFeedItem, sort: LiveDataSort): number {
  if (sort === 'bid-asc') {
    const bidA = feedItemOpeningBid(a)
    const bidB = feedItemOpeningBid(b)
    if (bidA == null && bidB == null) return 0
    if (bidA == null) return 1
    if (bidB == null) return -1
    if (bidA !== bidB) return bidA - bidB
  }

  if (sort === 'ratio-asc') {
    const ratioA = feedItemBidToAssessedRatio(a)
    const ratioB = feedItemBidToAssessedRatio(b)
    if (ratioA == null && ratioB == null) return 0
    if (ratioA == null) return 1
    if (ratioB == null) return -1
    if (ratioA !== ratioB) return ratioA - ratioB
  }

  const dateA = feedItemSortTime(a)
  const dateB = feedItemSortTime(b)
  const validA = !Number.isNaN(dateA)
  const validB = !Number.isNaN(dateB)
  if (validA && validB && dateA !== dateB) return dateA - dateB
  if (validA && !validB) return -1
  if (!validA && validB) return 1
  return feedItemCounty(a).localeCompare(feedItemCounty(b))
}

export function filterAndSortFeedItems(
  items: LiveDataFeedItem[],
  filters: LiveDataFilterState,
  searchQuery: string
): LiveDataFeedItem[] {
  const q = searchQuery.trim()
  let result = items.filter(item => {
    if (q && !matchesSearch(item, q)) return false
    return passesFilters(item, filters)
  })
  result = [...result].sort((a, b) => compareFeedItems(a, b, filters.sort))
  return result
}

export function collectFeedCounties(
  items: LiveDataFeedItem[],
  stateFilter: LiveDataStateFilter = 'all'
): string[] {
  const set = new Set<string>()
  for (const item of items) {
    if (stateFilter !== 'all' && feedItemState(item) !== stateFilter) continue
    set.add(feedItemCounty(item))
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}
