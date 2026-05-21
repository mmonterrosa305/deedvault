/** Unified foreclosure feed row for dashboard Foreclosures tab. */

export type ForeclosureCategory = 'auction' | 'pre-foreclosure' | 'lis-pendens'

export type ForeclosureListing = {
  id: string
  category: ForeclosureCategory
  county: string
  countyKey: string
  state: 'FL'
  address: string
  caseNumber: string
  parcelId: string
  openingBid: number | null
  estimatedValue: number | null
  /** ISO date (auction or recording/filing). */
  eventDate: string
  eventDateDisplay: string
  auctionType: string | null
  sourceUrl: string
  sourceLabel: string
}

export const MIAMI_DADE_CLERK_HOME = 'https://www.miami-dadeclerk.com'
export const MIAMI_DADE_OFFICIAL_RECORDS_URL =
  'https://onlineservices.miamidadeclerk.gov/officialrecords?source=MFS'
