export type Listing = {
  id: string
  state: string
  county: string
  addr: string
  parcel: string
  auction: (typeof AUCTION_TYPES)[number]
  platform: string
  status: 'Active' | 'Upcoming' | 'Closed'
  date: string
  minBid: number
  assessed: number
  prop: (typeof PROPERTY_TYPES)[number]
}

/** Sample listings removed — use the Live Data tab for Miami-Dade records. */
export const LISTINGS: readonly Listing[] = []

export const PROPERTY_TYPES = ['Residential', 'Commercial', 'Land'] as const
export const AUCTION_TYPES = ['Live', 'Online', 'OCP'] as const
export const LISTING_MAX_BID = 520000
export const LISTING_MAX_ASSESSED = 520000

export const fmt = (n: number) => '$' + n.toLocaleString()

export const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

export function daysUntilAuction(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const auction = new Date(dateStr + 'T12:00:00')
  return Math.ceil((auction.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function getListingById(id: string): Listing | undefined {
  return LISTINGS.find(l => l.id === id)
}
