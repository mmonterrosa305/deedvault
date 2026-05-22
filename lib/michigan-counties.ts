/**
 * Michigan county auction research registry (20 target counties).
 * Tax deed / forfeiture sales are treasurer auctions after circuit-court foreclosure judgment.
 * Mortgage foreclosure sales are separate (sheriff / circuit court) and rarely have a unified API.
 */

export type MichiganAuctionPlatform =
  | 'own'
  | 'tax-sale-info'
  | 'bid4assets'
  | 'sri'
  | 'auction.com'
  | 'macomb-portal'
  | 'in-person'
  | 'mixed'

export type MichiganCountyInfo = {
  key: string
  name: string
  /** Tax forfeiture / tax deed auction information */
  taxDeedUrl: string
  /** Mortgage / judicial foreclosure (circuit court) — often notices only */
  foreclosureUrl: string
  circuitCourtUrl: string
  platform: MichiganAuctionPlatform
  platformNotes: string
  /** Whether DeedVault has a live listing connector for this county */
  hasLiveConnector: boolean
}

export const MI_TARGET_COUNTY_KEYS = [
  'wayne',
  'oakland',
  'macomb',
  'kent',
  'washtenaw',
  'ingham',
  'genesee',
  'kalamazoo',
  'saginaw',
  'muskegon',
  'bay',
  'calhoun',
  'jackson',
  'livingston',
  'monroe',
  'stclair',
  'berrien',
  'ottawa',
  'allegan',
  'vanburen',
] as const

export type MichiganTargetCountyKey = (typeof MI_TARGET_COUNTY_KEYS)[number]

export const MI_TARGET_COUNTIES: MichiganCountyInfo[] = [
  {
    key: 'wayne',
    name: 'Wayne',
    taxDeedUrl: 'https://waynecountytreasurermi.com/',
    foreclosureUrl:
      'https://www.waynecountymi.gov/Government/Elected-Officials/Treasurer/Claims-Auctions',
    circuitCourtUrl: 'https://www.3rdcc.org/',
    platform: 'own',
    platformNotes:
      'Wayne County Treasurer online auction (WCAuction API). Foreclosure judgment entered in Wayne Circuit Court before sale.',
    hasLiveConnector: true,
  },
  {
    key: 'oakland',
    name: 'Oakland',
    taxDeedUrl: 'https://www.oakgov.com/government/oakland-county-treasurer-s-office/land-sale',
    foreclosureUrl:
      'https://www.oakgov.com/government/oakland-county-treasurer-s-office/property-taxes/property-tax-foreclosure-surplus-claims',
    circuitCourtUrl: 'https://www.oakgov.com/government/courts/circuit-court',
    platform: 'tax-sale-info',
    platformNotes:
      'Tax deed land sales via Title Check / tax-sale.info. Also listed on Bid4Assets calendar and SRI search for some cycles.',
    hasLiveConnector: true,
  },
  {
    key: 'macomb',
    name: 'Macomb',
    taxDeedUrl:
      'https://www.macombgov.org/departments/treasurers-office/tax-foreclosure/auction-and-claims',
    foreclosureUrl:
      'https://www.macombgov.org/departments/treasurers-office/tax-foreclosure',
    circuitCourtUrl: 'https://www.macombgov.org/government/courts/circuit-court',
    platform: 'macomb-portal',
    platformNotes:
      'County treasurer posts auction list on macombgov.org (July–November). SRI and Bid4Assets may list related sales.',
    hasLiveConnector: true,
  },
  {
    key: 'kent',
    name: 'Kent',
    taxDeedUrl: 'https://www.accesskent.com/Departments/Treasurer/Auction.htm',
    foreclosureUrl: 'https://www.accesskent.com/Departments/Treasurer/Auction.htm',
    circuitCourtUrl: 'https://www.kentcountymi.gov/175/Circuit-Court',
    platform: 'tax-sale-info',
    platformNotes:
      'Tax foreclosure auctions run online through tax-sale.info (Title Check, LLC agent).',
    hasLiveConnector: true,
  },
  {
    key: 'washtenaw',
    name: 'Washtenaw',
    taxDeedUrl: 'https://www.washtenaw.org/1155/Property-Auctions',
    foreclosureUrl: 'https://www.washtenaw.org/1155/Property-Auctions',
    circuitCourtUrl: 'https://www.washtenawtrialcourt.org/22/Circuit-Court',
    platform: 'auction.com',
    platformNotes:
      'Washtenaw Treasurer conducts tax foreclosure sales on Auction.com (see washtenaw.org/auction). Bid4Assets may mirror some events.',
    hasLiveConnector: true,
  },
  {
    key: 'ingham',
    name: 'Ingham',
    taxDeedUrl: 'https://www.ingham.org/departments/treasurer',
    foreclosureUrl: 'https://www.ingham.org/departments/treasurer',
    circuitCourtUrl: 'https://www.ingham.org/departments/courts/circuit-court',
    platform: 'sri',
    platformNotes: 'Ingham tax sales appear in SRI Services / sri-taxsale.com search API.',
    hasLiveConnector: true,
  },
  {
    key: 'genesee',
    name: 'Genesee',
    taxDeedUrl: 'https://www.geneseecountymi.gov/departments/treasurer',
    foreclosureUrl: 'https://www.geneseecountymi.gov/departments/treasurer',
    circuitCourtUrl: 'https://www.geneseecountymi.gov/departments/courts/circuit-court',
    platform: 'mixed',
    platformNotes: 'Genesee tax sales on SRI and Bid4Assets when scheduled.',
    hasLiveConnector: true,
  },
  {
    key: 'kalamazoo',
    name: 'Kalamazoo',
    taxDeedUrl: 'https://www.kalcounty.com/treasurer/',
    foreclosureUrl: 'https://www.kalcounty.com/treasurer/',
    circuitCourtUrl: 'https://www.kalcounty.com/courts/circuit-court/',
    platform: 'mixed',
    platformNotes:
      'Kalamazoo grouped on tax-sale.info (Barry/Calhoun/Kalamazoo auction) plus SRI and Bid4Assets.',
    hasLiveConnector: true,
  },
  {
    key: 'saginaw',
    name: 'Saginaw',
    taxDeedUrl: 'https://www.saginawcounty.com/departments/treasurer',
    foreclosureUrl: 'https://www.saginawcounty.com/departments/treasurer',
    circuitCourtUrl: 'https://www.saginawcounty.com/departments/courts/circuit-court',
    platform: 'mixed',
    platformNotes: 'Saginaw tax sales on SRI and Bid4Assets when scheduled.',
    hasLiveConnector: true,
  },
  {
    key: 'muskegon',
    name: 'Muskegon',
    taxDeedUrl: 'https://www.muskegoncounty.gov/departments/treasurer',
    foreclosureUrl: 'https://www.muskegoncounty.gov/departments/treasurer',
    circuitCourtUrl: 'https://www.muskegoncounty.gov/departments/courts/circuit-court',
    platform: 'mixed',
    platformNotes:
      'Muskegon grouped on tax-sale.info (Kent/Muskegon/Oceana/Ottawa auction) plus SRI and Bid4Assets.',
    hasLiveConnector: true,
  },
  {
    key: 'bay',
    name: 'Bay',
    taxDeedUrl: 'https://www.baycounty-mi.gov/Departments/Treasurer/',
    foreclosureUrl: 'https://www.baycounty-mi.gov/Departments/Treasurer/',
    circuitCourtUrl: 'https://www.baycounty-mi.gov/Departments/Courts/Circuit-Court/',
    platform: 'mixed',
    platformNotes:
      'Bay included in tax-sale.info regional auctions (e.g. Arenac/Bay/Gladwin) and SRI property search.',
    hasLiveConnector: true,
  },
  {
    key: 'calhoun',
    name: 'Calhoun',
    taxDeedUrl: 'https://www.calhouncountymi.gov/government/treasurer',
    foreclosureUrl: 'https://www.calhouncountymi.gov/government/treasurer',
    circuitCourtUrl: 'https://www.calhouncountymi.gov/government/courts/circuit-court',
    platform: 'mixed',
    platformNotes:
      'Calhoun on tax-sale.info (Barry/Calhoun/Kalamazoo auction), SRI, and Bid4Assets when listed.',
    hasLiveConnector: true,
  },
  {
    key: 'jackson',
    name: 'Jackson',
    taxDeedUrl: 'https://www.co.jackson.mi.us/308/Treasurer',
    foreclosureUrl: 'https://www.co.jackson.mi.us/308/Treasurer',
    circuitCourtUrl: 'https://www.co.jackson.mi.us/150/Circuit-Court',
    platform: 'mixed',
    platformNotes:
      'Jackson on tax-sale.info regional auctions and SRI; mortgage foreclosures via local legal notices.',
    hasLiveConnector: true,
  },
  {
    key: 'livingston',
    name: 'Livingston',
    taxDeedUrl: 'https://www.livgov.com/treasurer',
    foreclosureUrl: 'https://www.livgov.com/treasury',
    circuitCourtUrl: 'https://www.livgov.com/courts/circuit-court',
    platform: 'tax-sale-info',
    platformNotes:
      'Livingston DNR/state parcels on tax-sale.info; county treasurer posts forfeiture info on livgov.com.',
    hasLiveConnector: true,
  },
  {
    key: 'monroe',
    name: 'Monroe',
    taxDeedUrl: 'https://www.co.monroe.mi.us/officials_and_departments/departments_a_-_e/county_treasurer/index.php',
    foreclosureUrl:
      'https://www.co.monroe.mi.us/officials_and_departments/departments_a_-_e/county_treasurer/index.php',
    circuitCourtUrl: 'https://www.co.monroe.mi.us/officials_and_departments/courts/circuit_court/index.php',
    platform: 'in-person',
    platformNotes:
      'Monroe treasurer conducts tax foreclosure sales; check treasurer site for posted lists (often in-person / sealed bid).',
    hasLiveConnector: false,
  },
  {
    key: 'stclair',
    name: 'St. Clair',
    taxDeedUrl: 'https://www.stclaircounty.org/Offices/Treasurer/',
    foreclosureUrl: 'https://www.stclaircounty.org/Offices/Treasurer/',
    circuitCourtUrl: 'https://www.stclaircounty.org/Offices/Circuit-Court/',
    platform: 'in-person',
    platformNotes:
      'St. Clair tax foreclosure auction information published by county treasurer; no stable public API found.',
    hasLiveConnector: false,
  },
  {
    key: 'berrien',
    name: 'Berrien',
    taxDeedUrl: 'https://www.berriencounty.org/198/Treasurer',
    foreclosureUrl: 'https://www.berriencounty.org/198/Treasurer',
    circuitCourtUrl: 'https://www.berriencounty.org/155/Circuit-Court',
    platform: 'tax-sale-info',
    platformNotes:
      'Berrien grouped on tax-sale.info (Allegan/Berrien/Cass/Van Buren auction) and SRI when scheduled.',
    hasLiveConnector: true,
  },
  {
    key: 'ottawa',
    name: 'Ottawa',
    taxDeedUrl: 'https://www.miottawa.org/departments/treasurer',
    foreclosureUrl: 'https://www.miottawa.org/departments/treasurer',
    circuitCourtUrl: 'https://www.miottawa.org/departments/courts/circuit-court',
    platform: 'tax-sale-info',
    platformNotes:
      'Ottawa grouped on tax-sale.info (Kent/Muskegon/Oceana/Ottawa auction) and Bid4Assets when listed.',
    hasLiveConnector: true,
  },
  {
    key: 'allegan',
    name: 'Allegan',
    taxDeedUrl: 'https://www.allegancounty.org/departments/treasurer',
    foreclosureUrl: 'https://www.allegancounty.org/departments/treasurer',
    circuitCourtUrl: 'https://www.allegancounty.org/departments/courts/circuit-court',
    platform: 'tax-sale-info',
    platformNotes: 'Allegan catalog on tax-sale.info; also SRI and Bid4Assets for some sales.',
    hasLiveConnector: true,
  },
  {
    key: 'vanburen',
    name: 'Van Buren',
    taxDeedUrl: 'https://www.vanburencountymi.gov/departments/treasurer',
    foreclosureUrl: 'https://www.vanburencountymi.gov/departments/treasurer',
    circuitCourtUrl: 'https://www.vanburencountymi.gov/departments/courts/circuit-court',
    platform: 'tax-sale-info',
    platformNotes:
      'Van Buren grouped on tax-sale.info (Allegan/Berrien/Cass/Van Buren auction).',
    hasLiveConnector: true,
  },
]

export function michiganCountyByKey(key: string): MichiganCountyInfo | undefined {
  return MI_TARGET_COUNTIES.find(c => c.key === key)
}

export function normalizeMichiganCountyKey(name: string): string | null {
  const n = name.toLowerCase().replace(/[^a-z]/g, '')
  const aliases: Record<string, string> = {
    stclair: 'stclair',
    saintclair: 'stclair',
    vanburen: 'vanburen',
    vanburencounty: 'vanburen',
  }
  if (aliases[n]) return aliases[n]
  const hit = MI_TARGET_COUNTIES.find(
    c => n === c.key || n === c.name.toLowerCase().replace(/[^a-z]/g, '')
  )
  return hit?.key ?? null
}

export const PLATFORM_LABEL: Record<MichiganAuctionPlatform, string> = {
  own: 'County auction site',
  'tax-sale-info': 'tax-sale.info (Title Check)',
  bid4assets: 'Bid4Assets',
  sri: 'SRI Services',
  'auction.com': 'Auction.com',
  'macomb-portal': 'Macomb County portal',
  'in-person': 'County treasurer (in-person / posted list)',
  mixed: 'Multiple platforms',
}
