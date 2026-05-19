/** Auction dates are set 30–90 days ahead (relative to May 2026) for dashboard filters. */
export const LISTINGS = [
  { id:'FL-ALA-001', state:'FL', county:'Alachua',     addr:'2241 NW 23rd Blvd, Gainesville, FL 32605',        parcel:'07182-025-000',          auction:'Online', platform:'GovEase',              status:'Upcoming', date:'2026-06-17', minBid:8400,  assessed:62000,  prop:'Residential' },
  { id:'FL-BRO-001', state:'FL', county:'Broward',     addr:'1540 NW 7th Ave, Fort Lauderdale, FL 33311',       parcel:'50-42-34-0A-0360',       auction:'Online', platform:'RealTDX',             status:'Active',   date:'2026-06-20', minBid:22100, assessed:185000, prop:'Residential' },
  { id:'FL-DAD-001', state:'FL', county:'Miami-Dade',  addr:'8901 SW 152nd St, Miami, FL 33157',                parcel:'30-5921-000-0480',       auction:'Live',   platform:'Courthouse',          status:'Upcoming', date:'2026-06-23', minBid:15800, assessed:210000, prop:'Residential' },
  { id:'FL-DAD-002', state:'FL', county:'Miami-Dade',  addr:'14200 Biscayne Blvd, North Miami, FL 33181',       parcel:'07-2221-004-1360',       auction:'Online', platform:'RealTDX',             status:'Closed',   date:'2026-06-26', minBid:31500, assessed:420000, prop:'Commercial'  },
  { id:'FL-ORA-001', state:'FL', county:'Orange',      addr:'4800 Curry Ford Rd, Orlando, FL 32812',            parcel:'24-23-30-3270-00-400',   auction:'Online', platform:'GovEase',             status:'Upcoming', date:'2026-06-29', minBid:9200,  assessed:78000,  prop:'Residential' },
  { id:'FL-ORA-002', state:'FL', county:'Orange',      addr:'255 E Main St, Apopka, FL 32703',                     parcel:'35-21-28-0000-00-085',   auction:'OCP',    platform:'County Clerk',        status:'Active',   date:'2026-07-02', minBid:2100,  assessed:14000,  prop:'Land'        },
  { id:'FL-HIL-001', state:'FL', county:'Hillsborough',addr:'3910 N 22nd St, Tampa, FL 33605',                  parcel:'126543.0000',            auction:'Online', platform:'Bid4Assets',          status:'Upcoming', date:'2026-07-05', minBid:11700, assessed:92000,  prop:'Residential' },
  { id:'FL-LEE-001', state:'FL', county:'Lee',         addr:'2130 Crystal Dr, Fort Myers, FL 33901',            parcel:'20-44-24-L3-00100',      auction:'Live',   platform:'Courthouse',          status:'Closed',   date:'2026-07-08', minBid:18200, assessed:155000, prop:'Residential' },
  { id:'FL-VOL-001', state:'FL', county:'Volusia',     addr:'500 Herbert St, Daytona Beach, FL 32114',          parcel:'5305-00-00-0010',        auction:'Online', platform:'GovEase',             status:'Upcoming', date:'2026-07-11', minBid:6300,  assessed:48000,  prop:'Commercial'  },
  { id:'FL-PAL-001', state:'FL', county:'Palm Beach',  addr:'1824 Lake Worth Rd, Lake Worth, FL 33461',         parcel:'38-43-44-17-06-023',     auction:'Online', platform:'RealTDX',             status:'Active',   date:'2026-07-14', minBid:27600, assessed:310000, prop:'Residential' },
  { id:'MI-WAY-001', state:'MI', county:'Wayne',       addr:'14501 Mack Ave, Detroit, MI 48215',                parcel:'21009161',               auction:'Online', platform:'Bid4Assets',          status:'Active',   date:'2026-07-17', minBid:5500,  assessed:38000,  prop:'Residential' },
  { id:'MI-WAY-002', state:'MI', county:'Wayne',       addr:'7200 W Chicago Blvd, Detroit, MI 48209',                parcel:'22014522',               auction:'Online', platform:'Bid4Assets',          status:'Upcoming', date:'2026-07-20', minBid:3200,  assessed:22000,  prop:'Residential' },
  { id:'MI-WAY-003', state:'MI', county:'Wayne',       addr:'15440 Michigan Ave, Dearborn, MI 48126',            parcel:'82011004',               auction:'Live',   platform:'Wayne Co. Treasurer', status:'Upcoming', date:'2026-07-23', minBid:19800, assessed:160000, prop:'Commercial'  },
  { id:'MI-OAK-001', state:'MI', county:'Oakland',     addr:'1020 N Adams Rd, Birmingham, MI 48009',            parcel:'67-25-18-476-021',       auction:'Online', platform:'SRI',                 status:'Closed',   date:'2026-07-26', minBid:44200, assessed:520000, prop:'Residential' },
  { id:'MI-OAK-002', state:'MI', county:'Oakland',     addr:'100 W Lawrence St, Pontiac, MI 48342',                   parcel:'14-29-376-009',          auction:'OCP',    platform:'Oakland Co. Treasurer',status:'Active',  date:'2026-07-29', minBid:1800,  assessed:9500,   prop:'Land'        },
  { id:'MI-MAC-001', state:'MI', county:'Macomb',      addr:'25301 Harper Ave, St. Clair Shores, MI 48080',     parcel:'41-14-06-403-022',       auction:'Online', platform:'SRI',                 status:'Upcoming', date:'2026-08-01', minBid:16400, assessed:128000, prop:'Residential' },
  { id:'MI-GRK-001', state:'MI', county:'Kent',        addr:'1140 Bridge St NW, Grand Rapids, MI 49504',        parcel:'41-14-08-155-004',       auction:'Live',   platform:'Kent Co. Courthouse', status:'Upcoming', date:'2026-08-04', minBid:13100, assessed:98000,  prop:'Residential' },
  { id:'MI-ING-001', state:'MI', county:'Ingham',      addr:'703 Haslett Rd, East Lansing, MI 48823',           parcel:'33-20-02-05-201-049',    auction:'Online', platform:'SRI',                 status:'Closed',   date:'2026-08-07', minBid:9700,  assessed:74000,  prop:'Residential' },
  { id:'MI-WAS-001', state:'MI', county:'Washtenaw',   addr:'2340 Packard Rd, Ann Arbor, MI 48104',             parcel:'09-09-28-302-010',       auction:'Online', platform:'Bid4Assets',          status:'Active',   date:'2026-08-10', minBid:28900, assessed:295000, prop:'Residential' },
  { id:'FL-SAR-001', state:'FL', county:'Sarasota',    addr:'1702 Bahia Vista St, Sarasota, FL 34239',          parcel:'0058-14-0052',           auction:'Online', platform:'GovEase',             status:'Active',   date:'2026-08-13', minBid:19300, assessed:168000, prop:'Residential' },
] as const

export type Listing = (typeof LISTINGS)[number]

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
