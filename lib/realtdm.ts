/**
 * Florida clerk RealTDM public tax deed case search (multi-county).
 */

function parseSaleDate(saleDate: string): Date | null {
  const trimmed = saleDate.trim()
  if (!trimmed) return null
  const parsed = Date.parse(trimmed)
  if (Number.isNaN(parsed)) return null
  const d = new Date(parsed)
  d.setHours(0, 0, 0, 0)
  return d
}

export function isUpcomingSale(saleDate: string): boolean {
  const sale = parseSaleDate(saleDate)
  if (!sale) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return sale.getTime() >= today.getTime()
}

export type RealTdmCounty = {
  key: string
  name: string
  subdomain: string
}

/** Florida counties on the RealTDM platform */
export const FL_REALTDM_COUNTIES: readonly RealTdmCounty[] = [
  { key: 'miamidade', name: 'Miami-Dade', subdomain: 'miamidade' },
  { key: 'broward', name: 'Broward', subdomain: 'broward' },
  { key: 'palmbeach', name: 'Palm Beach', subdomain: 'palmbeach' },
  { key: 'hillsborough', name: 'Hillsborough', subdomain: 'hillsborough' },
  { key: 'pinellas', name: 'Pinellas', subdomain: 'pinellas' },
  { key: 'polk', name: 'Polk', subdomain: 'polk' },
  { key: 'volusia', name: 'Volusia', subdomain: 'volusia' },
  { key: 'marion', name: 'Marion', subdomain: 'marion' },
  { key: 'lake', name: 'Lake', subdomain: 'lake' },
  { key: 'osceola', name: 'Osceola', subdomain: 'osceola' },
  { key: 'brevard', name: 'Brevard', subdomain: 'brevard' },
  { key: 'pasco', name: 'Pasco', subdomain: 'pasco' },
  { key: 'manatee', name: 'Manatee', subdomain: 'manatee' },
  { key: 'sarasota', name: 'Sarasota', subdomain: 'sarasota' },
  { key: 'charlotte', name: 'Charlotte', subdomain: 'charlotte' },
  { key: 'leefl', name: 'Lee', subdomain: 'leefl' },
  { key: 'collier', name: 'Collier', subdomain: 'collier' },
] as const

export const FL_REALTDM_COUNTY_COUNT = FL_REALTDM_COUNTIES.length

export function getCountyByKey(key: string): RealTdmCounty | undefined {
  return FL_REALTDM_COUNTIES.find(c => c.key === key)
}

export function countyBaseUrl(county: RealTdmCounty): string {
  return `https://${county.subdomain}.realtdm.com`
}

export function countyCaseListUrl(county: RealTdmCounty): string {
  return `${countyBaseUrl(county)}/public/cases/list`
}

export function countyCaseDetailsUrl(county: RealTdmCounty): string {
  return `${countyBaseUrl(county)}/public/cases/details`
}

/**
 * RealTDM filtercasestatus values — upcoming resale auctions only.
 * Historical sold/defaulted/redemption statuses are excluded (past sale dates).
 * @see https://miamidade.realtdm.com/public/cases/list
 */
export const REALTDM_UPCOMING_STATUS_IDS = ['448', '449'] as const

/** @deprecated Use REALTDM_UPCOMING_STATUS_IDS */
export const REALTDM_ACTIVE_STATUS_IDS = REALTDM_UPCOMING_STATUS_IDS

/** @deprecated Use REALTDM_UPCOMING_STATUS_IDS */
export const REALTDM_RESALE_STATUS_IDS = REALTDM_UPCOMING_STATUS_IDS

export const REALTDM_UPCOMING_STATUS_LABELS = [
  'ACTIVE - RESALE 30DAY (1 ADV)',
  'ACTIVE - RESALE FULL (4 ADV)',
] as const

/** @deprecated Use REALTDM_UPCOMING_STATUS_LABELS */
export const REALTDM_ACTIVE_STATUS_LABELS = REALTDM_UPCOMING_STATUS_LABELS

/** @deprecated Use REALTDM_UPCOMING_STATUS_LABELS */
export const REALTDM_RESALE_STATUS_LABELS = REALTDM_UPCOMING_STATUS_LABELS

export type RealTdmCase = {
  county: string
  countyKey: string
  subdomain: string
  caseId: string
  caseNumber: string
  parcelNumber: string
  parcelNormalized: string
  saleDate: string
  openingBid: number | null
  propertyAddress: string
  status: string
}

export type CountyFetchResult = {
  county: RealTdmCounty
  /** Upcoming sales only (today or later), with detail enrichment applied */
  cases: RealTdmCase[]
  totalListed: number
  upcomingCount: number
  detailsEnriched: number
  error?: string
}

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const DETAIL_FETCH_CONCURRENCY = 12
const MAX_LIST_PAGES_PER_COUNTY = 3

export function caseUniqueId(c: Pick<RealTdmCase, 'countyKey' | 'caseId'>): string {
  return `${c.countyKey}:${c.caseId}`
}

export function normalizeParcelNumber(parcel: string): string {
  return parcel.replace(/\D/g, '')
}

function mergeCookies(existing: string, setCookieHeaders: string[]): string {
  const jar = new Map<string, string>()
  for (const part of existing.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k) jar.set(k, rest.join('='))
  }
  for (const header of setCookieHeaders) {
    const pair = header.split(';')[0]?.trim()
    if (!pair) continue
    const [k, ...rest] = pair.split('=')
    if (k) jar.set(k, rest.join('='))
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseMoney(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

type ListCase = Omit<RealTdmCase, 'openingBid' | 'propertyAddress'>

function parseListCases(html: string, county: RealTdmCounty): ListCase[] {
  const cases: ListCase[] = []
  const seen = new Set<string>()

  const mobileBlocks = html.matchAll(
    /<div class="content-box contain mt-1 p-4 load-case link" data-caseID="(\d+)"[\s\S]*?<div class="fs-5">CASE #([^<]+)<\/div>[\s\S]*?<div class="mt-1 text-large opacity-75">([^<]+)<\/div>[\s\S]*?Parcel Number<\/div>\s*<div class="data-value text-end">([^<]+)<\/div>[\s\S]*?Sale Date<\/div>\s*<div class="data-value text-end">([^<]+)<\/div>/gi
  )

  for (const m of mobileBlocks) {
    const caseId = m[1]
    const uid = `${county.key}:${caseId}`
    if (seen.has(uid)) continue
    seen.add(uid)
    cases.push(listCaseFromMatch(county, m))
  }

  if (cases.length > 0) return cases

  const rowBlocks = html.matchAll(
    /<tr class="link load-case" data-caseID="(\d+)"[\s\S]*?<div>([^<]+)<\/div>[\s\S]*?<td class="text-end">([^<]+)<\/td>[\s\S]*?<td class="text-end">[^<]+<\/td>[\s\S]*?<td class="text-end">[^<]+<\/td>[\s\S]*?<td class="text-end">([^<]+)<\/td>[\s\S]*?<td class="text-end">([^<]+)<\/td>/gi
  )

  for (const m of rowBlocks) {
    const caseId = m[1]
    const uid = `${county.key}:${caseId}`
    if (seen.has(uid)) continue
    seen.add(uid)
    cases.push({
      county: county.name,
      countyKey: county.key,
      subdomain: county.subdomain,
      caseId,
      caseNumber: m[3].trim(),
      status: m[2].trim(),
      parcelNumber: m[4].trim(),
      parcelNormalized: normalizeParcelNumber(m[4]),
      saleDate: m[5].trim(),
    })
  }

  return cases
}

function listCaseFromMatch(county: RealTdmCounty, m: RegExpMatchArray): ListCase {
  return {
    county: county.name,
    countyKey: county.key,
    subdomain: county.subdomain,
    caseId: m[1],
    caseNumber: m[2].trim(),
    status: m[3].trim(),
    parcelNumber: m[4].trim(),
    parcelNormalized: normalizeParcelNumber(m[4]),
    saleDate: m[5].trim(),
  }
}

function cleanPropertyAddress(raw: string): string | null {
  const text = raw
    .replace(/&nbsp;/gi, ' ')
    .replace(/,?\s*FL\s*$/i, '')
    .replace(/^,\s*/, '')
    .trim()

  if (!text || /no address/i.test(text)) return null

  const parts = text
    .split(/[\n,]+/)
    .map(p => p.trim())
    .filter(Boolean)

  for (const part of parts) {
    if (/no address/i.test(part)) continue
    if (/\d/.test(part) && part.length > 4) return part
  }

  return parts[0] ?? null
}

function parsePropertyAddress(html: string): string {
  const patterns = [
    /<div class="data-label">Property Address<\/div>\s*<div class="data-value[^"]*">([\s\S]*?)<\/div>/gi,
    /<div class="data-label">Property Address<\/div>\s*<div class="data-value">([\s\S]*?)<\/div>/gi,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(html)) !== null) {
      const addr = cleanPropertyAddress(stripTags(match[1]))
      if (addr) return addr
    }
  }

  return 'Address not available'
}

function parseDetails(html: string): Pick<RealTdmCase, 'openingBid' | 'propertyAddress' | 'saleDate' | 'status'> {
  const openingBidMatch = html.match(
    /<div class="title">Opening Bid<\/div>\s*<div class="value">([^<]+)/i
  )
  const openingBid = openingBidMatch ? parseMoney(openingBidMatch[1]) : null
  const propertyAddress = parsePropertyAddress(html)
  const saleDateMatch = html.match(
    /<div class="data-label">Sale Date<\/div>\s*<div class="data-value">([^<]+)/i
  )
  const saleDate = saleDateMatch ? stripTags(saleDateMatch[1]) : ''
  const statusMatch = html.match(
    /<div class="title me-2 fs-6">Status:<\/div>\s*<div class="value[^"]*">([^<]+)/i
  )
  const status = statusMatch ? stripTags(statusMatch[1]) : ''

  return { openingBid, propertyAddress, saleDate, status }
}

function parseTotalPages(html: string): number {
  const match = html.match(/Page\s+\d+\s+of\s+(\d+)/i)
  return match ? Math.max(1, parseInt(match[1], 10)) : 1
}

async function realTdmPost(
  county: RealTdmCounty,
  url: string,
  body: URLSearchParams,
  cookie: string
): Promise<{ html: string; cookie: string }> {
  const base = countyBaseUrl(county)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': BROWSER_UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html,application/xhtml+xml',
      Origin: base,
      Referer: countyCaseListUrl(county),
      Cookie: cookie,
    },
    body: body.toString(),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`${county.name} RealTDM HTTP ${res.status}`)
  }

  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
  const nextCookie = setCookies.length ? mergeCookies(cookie, setCookies) : cookie
  const html = await res.text()

  if (/Application Exception|CODE 500/i.test(html)) {
    throw new Error(`${county.name} RealTDM application error`)
  }

  return { html, cookie: nextCookie }
}

function buildListSearchBody(page: number, perPage: number): URLSearchParams {
  return new URLSearchParams({
    filterPageNumber: String(page),
    filterFiltered: '1',
    sectionRouteCode: '',
    isPublic: '1',
    filtercasestatus: REALTDM_UPCOMING_STATUS_IDS.join(','),
    filterpartyname: '',
    filterCaseNumber: '',
    filterParcelNumber: '',
    filterapplicationnumber: '',
    filtercertificatenumber: '',
    filterPropAddress: '',
    filterSaleDateStart: '',
    filterSaleDateStop: '',
    filterCasesPerPage: String(perPage),
  })
}

function formatParcelFromFolio(folio: string): string {
  const d = folio.replace(/\D/g, '')
  if (d.length !== 13) return d
  return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 9)}-${d.slice(9, 13)}`
}

async function fetchCaseDetails(
  county: RealTdmCounty,
  caseId: string,
  cookie: string
): Promise<Partial<RealTdmCase> | null> {
  const body = new URLSearchParams({
    caseID: caseId,
    openCaseList: '',
    isPublic: '1',
  })

  const { html } = await realTdmPost(county, countyCaseDetailsUrl(county), body, cookie)
  const details = parseDetails(html)

  const caseNumberMatch = html.match(/Case\s*#\s*([^<\s]+)/i)
  const parcelMatch = html.match(/folio=(\d+)/i) ?? html.match(/>(\d{2}-\d{4}-\d{3}-\d{4})</)

  const parcelNumber = parcelMatch
    ? parcelMatch[1].includes('-')
      ? parcelMatch[1]
      : formatParcelFromFolio(parcelMatch[1])
    : ''

  if (!caseNumberMatch && !parcelNumber) return null

  return {
    caseNumber: caseNumberMatch?.[1]?.trim() ?? '',
    parcelNumber,
    parcelNormalized: normalizeParcelNumber(parcelNumber),
    saleDate: details.saleDate,
    openingBid: details.openingBid,
    propertyAddress: details.propertyAddress,
    status: details.status,
  }
}

function mergeListAndDetails(listCase: ListCase, detailed: Partial<RealTdmCase> | null): RealTdmCase {
  if (!detailed) {
    return { ...listCase, openingBid: null, propertyAddress: 'Address not available' }
  }

  const propertyAddress =
    detailed.propertyAddress && detailed.propertyAddress !== 'Address not available'
      ? detailed.propertyAddress
      : 'Address not available'

  return {
    ...listCase,
    caseNumber: detailed.caseNumber || listCase.caseNumber,
    parcelNumber: detailed.parcelNumber || listCase.parcelNumber,
    parcelNormalized: detailed.parcelNormalized || listCase.parcelNormalized,
    saleDate: detailed.saleDate || listCase.saleDate,
    status: detailed.status || listCase.status,
    openingBid: detailed.openingBid ?? null,
    propertyAddress,
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return []
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await fn(items[index])
    }
  }

  const workers = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}

async function fetchAllListCases(
  county: RealTdmCounty,
  perPage: number,
  cookie: string
): Promise<{ cases: ListCase[]; cookie: string }> {
  const seen = new Set<string>()
  const all: ListCase[] = []
  let currentCookie = cookie
  let totalPages = 1

  for (let page = 1; page <= totalPages && page <= MAX_LIST_PAGES_PER_COUNTY; page++) {
    const { html, cookie: nextCookie } = await realTdmPost(
      county,
      countyCaseListUrl(county),
      buildListSearchBody(page, perPage),
      currentCookie
    )
    currentCookie = nextCookie
    if (page === 1) totalPages = parseTotalPages(html)

    for (const listCase of parseListCases(html, county)) {
      const uid = caseUniqueId(listCase)
      if (seen.has(uid)) continue
      seen.add(uid)
      all.push(listCase)
    }
  }

  return { cases: all, cookie: currentCookie }
}

/** Fetch tax deed cases for a single Florida county (list only). */
export async function fetchCountyTaxDeedCases(
  county: RealTdmCounty,
  perPage = 100
): Promise<CountyFetchResult> {
  try {
    const { cases: listCases } = await fetchAllListCases(county, perPage, '')
    const cases = listCases.map(c => mergeListAndDetails(c, null))
    return {
      county,
      cases,
      totalListed: listCases.length,
      upcomingCount: 0,
      detailsEnriched: 0,
    }
  } catch (err) {
    return {
      county,
      cases: [],
      totalListed: 0,
      upcomingCount: 0,
      detailsEnriched: 0,
      error: err instanceof Error ? err.message : 'County fetch failed',
    }
  }
}

function countWithOpeningBid(cases: RealTdmCase[]): number {
  return cases.filter(c => c.openingBid != null).length
}

/** Enrich every list row from the county case details page (reuses list session cookie). */
async function enrichCountyListCases(
  county: RealTdmCounty,
  listCases: ListCase[],
  cookie: string
): Promise<RealTdmCase[]> {
  if (listCases.length === 0) return []

  return runWithConcurrency(listCases, DETAIL_FETCH_CONCURRENCY, async listCase => {
    try {
      const detailed = await fetchCaseDetails(county, listCase.caseId, cookie)
      return mergeListAndDetails(listCase, detailed)
    } catch {
      return mergeListAndDetails(listCase, null)
    }
  })
}

/**
 * Fetch list, enrich all cases from detail pages, return upcoming sales only.
 */
export async function fetchCountyTaxDeedCasesFull(
  county: RealTdmCounty,
  perPage = 100
): Promise<CountyFetchResult> {
  try {
    const { cases: listCases, cookie } = await fetchAllListCases(county, perPage, '')
    const enrichedAll = await enrichCountyListCases(county, listCases, cookie)
    const upcoming = sortBySaleDate(enrichedAll.filter(c => isUpcomingSale(c.saleDate)))

    return {
      county,
      cases: upcoming,
      totalListed: listCases.length,
      upcomingCount: upcoming.length,
      detailsEnriched: countWithOpeningBid(upcoming),
    }
  } catch (err) {
    return {
      county,
      cases: [],
      totalListed: 0,
      upcomingCount: 0,
      detailsEnriched: 0,
      error: err instanceof Error ? err.message : 'County fetch failed',
    }
  }
}

function sortBySaleDate(cases: RealTdmCase[]): RealTdmCase[] {
  return [...cases].sort((a, b) => {
    const da = parseSaleDate(a.saleDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const db = parseSaleDate(b.saleDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return da - db
  })
}

/** Fetch active tax deed cases from all Florida RealTDM counties in parallel. */
export async function fetchFloridaTaxDeedCases(perPage = 100): Promise<{
  cases: RealTdmCase[]
  count: number
  detailsEnriched: number
  totalListed: number
  counties: CountyFetchResult[]
}> {
  const countyResults = await Promise.all(
    FL_REALTDM_COUNTIES.map(county => fetchCountyTaxDeedCasesFull(county, perPage))
  )

  const cases = countyResults.flatMap(r => r.cases)
  const totalListed = countyResults.reduce((n, r) => n + r.totalListed, 0)
  const detailsEnriched = countyResults.reduce((n, r) => n + r.detailsEnriched, 0)

  return {
    cases,
    count: cases.length,
    detailsEnriched,
    totalListed,
    counties: countyResults,
  }
}

/** @deprecated Use fetchFloridaTaxDeedCases */
export async function fetchMiamiDadeTaxDeedCases(perPage = 100) {
  const result = await fetchFloridaTaxDeedCases(perPage)
  return {
    cases: result.cases,
    count: result.count,
    detailsEnriched: result.detailsEnriched,
    totalListed: result.totalListed,
  }
}

export type MiamiDadeCase = RealTdmCase
