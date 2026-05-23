/** Unified foreclosure feed row for dashboard Foreclosures tab. */

export const SALE_KIND_TAXDEED = 'TAXDEED' as const
export const SALE_KIND_FORECLOSURE = 'FORECLOSURE' as const

export type SaleKind = typeof SALE_KIND_TAXDEED | typeof SALE_KIND_FORECLOSURE

export type ForeclosureCategory = 'auction' | 'pre-foreclosure' | 'lis-pendens'

export type ForeclosureListing = {
  id: string
  category: ForeclosureCategory
  county: string
  countyKey: string
  state: 'FL' | 'MI'
  address: string
  caseNumber: string
  parcelId: string
  openingBid: number | null
  estimatedValue: number | null
  /** ISO date (auction or recording/filing). */
  eventDate: string
  eventDateDisplay: string
  /** TAXDEED or FORECLOSURE — used to separate Tax Deeds vs Foreclosures tabs. */
  auctionType: SaleKind | null
  /** Human-readable subtype (e.g. tax forfeiture group, clerk doc type). */
  auctionSubtype?: string | null
  sourceUrl: string
  sourceLabel: string
}

export function isTaxDeedListing(listing: ForeclosureListing): boolean {
  return listing.auctionType === SALE_KIND_TAXDEED
}

export function isForeclosureListing(listing: ForeclosureListing): boolean {
  return listing.auctionType === SALE_KIND_FORECLOSURE
}

export function listingTypeLabel(listing: ForeclosureListing): string | null {
  return listing.auctionSubtype ?? listing.auctionType
}

export const MIAMI_DADE_CLERK_HOME = 'https://www.miami-dadeclerk.com'
export const MIAMI_DADE_OFFICIAL_RECORDS_URL =
  'https://onlineservices.miamidadeclerk.gov/officialrecords?source=MFS'
