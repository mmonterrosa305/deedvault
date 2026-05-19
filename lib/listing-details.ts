import type { Listing } from '@/lib/listings'

const PLATFORM_URLS: Record<string, string> = {
  GovEase: 'https://www.govease.com',
  RealTDX: 'https://www.realtdx.com',
  Courthouse: 'https://www.miamidade.gov/clerk',
  'County Clerk': 'https://www.myorangeclerk.com',
  Bid4Assets: 'https://www.bid4assets.com',
  SRI: 'https://www.sri-inc.com',
  'Wayne Co. Treasurer': 'https://www.waynecounty.com/treasurer',
  'Oakland Co. Treasurer': 'https://www.oakgov.com/treasurer',
  'Kent Co. Courthouse': 'https://www.accesskent.com',
}

const OWNER_NAMES = ['Robert & Linda Martinez', 'James K. Whitfield', 'Estate of Helen Brooks', 'Carlos Mendez', 'Patricia Nguyen LLC']
const LENDERS = ['Wells Fargo Home Mortgage', 'Quicken Loans / Rocket Mortgage', 'Bank of America', 'US Bank NA', 'Chase Home Lending']
const LOAN_TYPES = ['Conventional 30-yr fixed', 'FHA insured', 'HELOC', 'Commercial note', 'Adjustable rate']

function hashId(id: string) {
  return id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
}

export function getExtendedData(listing: Listing) {
  const h = hashId(listing.id)
  return {
    owner: {
      name: OWNER_NAMES[h % OWNER_NAMES.length],
      phone: `(555) ${200 + (h % 700)}-${1000 + (h % 9000)}`,
      mailing: `${1200 + (h % 800)} ${['Oak', 'Pine', 'Maple', 'Cedar'][h % 4]} St, ${listing.county}, ${listing.state} ${32000 + (h % 7000)}`,
    },
    lender: {
      name: LENDERS[h % LENDERS.length],
      mortgage: Math.round(listing.assessed * (0.55 + (h % 30) / 100)),
      loanType: LOAN_TYPES[h % LOAN_TYPES.length],
    },
    platformUrl: PLATFORM_URLS[listing.platform] ?? 'https://example.com',
  }
}

export function getBidSteps(auction: string): string[] {
  if (auction === 'Live') {
    return [
      'Confirm auction date, time, and courthouse room on the county clerk website.',
      'Register as a bidder in person at least 30 minutes before the sale.',
      'Bring certified funds for the deposit amount required by the county.',
      'Obtain a bidder paddle or number from the auction clerk.',
      'Bid openly when your parcel is called; winning bids are binding immediately.',
      'Pay the full bid amount plus recording fees within 24 hours per county rules.',
    ]
  }
  if (auction === 'Online') {
    return [
      'Create an account on the listed online auction platform and verify your identity.',
      'Search for the parcel ID or address and add the listing to your watchlist.',
      'Review the certificate of sale, lien search, and redemption period for this county.',
      'Deposit the required registration fee or bid deposit before the auction opens.',
      'Place bids during the published window; proxy/max bids may be available.',
      'If you win, submit payment via the platform within the stated deadline.',
    ]
  }
  return [
    'Visit the county tax collector or treasurer office during business hours.',
    'Request the over-the-counter (OCP) list of available tax deed certificates.',
    'Confirm the parcel is still available and review outstanding liens.',
    'Complete the OCP application form and pay the advertised minimum bid plus fees.',
    'Receive the tax deed certificate; redemption period may still apply.',
    'Record the deed with the county clerk and obtain title insurance if required.',
  ]
}

export function streetViewImageUrl(addr: string, size = '600x400') {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
  if (!key) return null
  return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${encodeURIComponent(addr)}&key=${key}`
}
