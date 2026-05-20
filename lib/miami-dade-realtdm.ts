/**
 * Miami-Dade Clerk RealTDM public tax deed case search.
 * https://miamidade.realtdm.com/public/cases/list
 */

export const REALTDM_CASE_LIST_URL = 'https://miamidade.realtdm.com/public/cases/list'
export const REALTDM_CASE_DETAILS_URL = 'https://miamidade.realtdm.com/public/cases/details'

/**
 * RealTDM filtercasestatus values (public case search dropdown IDs).
 * @see https://miamidade.realtdm.com/public/cases/list
 */
export const REALTDM_ACTIVE_STATUS_IDS = [
  '193', // Active - Applicant Defaulted
  '194', // Active - Bidder Defaulted
  '196', // Active - Redemption
  '198', // Active - Sold
  '199', // Active - Sold Applicant
  '200', // Active - Sold Bidder
  '448', // Active - Resale 30Day (1 Adv)
  '449', // Active - Resale Full (4 Adv)
] as const

/** @deprecated Use REALTDM_ACTIVE_STATUS_IDS */
export const REALTDM_RESALE_STATUS_IDS = REALTDM_ACTIVE_STATUS_IDS

export const REALTDM_ACTIVE_STATUS_LABELS = [
  'ACTIVE - APPLICANT DEFAULTED',
  'ACTIVE - BIDDER DEFAULTED',
  'ACTIVE - REDEMPTION',
  'ACTIVE - SOLD',
  'ACTIVE - SOLD APPLICANT',
  'ACTIVE - SOLD BIDDER',
  'ACTIVE - RESALE 30DAY (1 ADV)',
  'ACTIVE - RESALE FULL (4 ADV)',
] as const

/** @deprecated Use REALTDM_ACTIVE_STATUS_LABELS */
export const REALTDM_RESALE_STATUS_LABELS = REALTDM_ACTIVE_STATUS_LABELS

/** Max cases to load opening bid / address from details (avoids multi-minute API calls). */
const MAX_DETAIL_ENRICHMENT = 120
const DETAIL_FETCH_CONCURRENCY = 10

export type MiamiDadeCase = {
  caseId: string
  caseNumber: string
  parcelNumber: string
  parcelNormalized: string
  saleDate: string
  openingBid: number | null
  propertyAddress: string
  status: string
}

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

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

export function normalizeParcelNumber(parcel: string): string {
  return parcel.replace(/\D/g, '')
}

function parseMoney(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function parseListCases(html: string): Omit<MiamiDadeCase, 'openingBid' | 'propertyAddress'>[] {
  const cases: Omit<MiamiDadeCase, 'openingBid' | 'propertyAddress'>[] = []
  const seen = new Set<string>()

  const mobileBlocks = html.matchAll(
    /<div class="content-box contain mt-1 p-4 load-case link" data-caseID="(\d+)"[\s\S]*?<div class="fs-5">CASE #([^<]+)<\/div>[\s\S]*?<div class="mt-1 text-large opacity-75">([^<]+)<\/div>[\s\S]*?Parcel Number<\/div>\s*<div class="data-value text-end">([^<]+)<\/div>[\s\S]*?Sale Date<\/div>\s*<div class="data-value text-end">([^<]+)<\/div>/gi
  )

  for (const m of mobileBlocks) {
    const caseId = m[1]
    if (seen.has(caseId)) continue
    seen.add(caseId)
    cases.push({
      caseId,
      caseNumber: m[2].trim(),
      status: m[3].trim(),
      parcelNumber: m[4].trim(),
      parcelNormalized: normalizeParcelNumber(m[4]),
      saleDate: m[5].trim(),
    })
  }

  if (cases.length > 0) return cases

  const rowBlocks = html.matchAll(
    /<tr class="link load-case" data-caseID="(\d+)"[\s\S]*?<div>([^<]+)<\/div>[\s\S]*?<td class="text-end">([^<]+)<\/td>[\s\S]*?<td class="text-end">[^<]+<\/td>[\s\S]*?<td class="text-end">[^<]+<\/td>[\s\S]*?<td class="text-end">([^<]+)<\/td>[\s\S]*?<td class="text-end">([^<]+)<\/td>/gi
  )

  for (const m of rowBlocks) {
    const caseId = m[1]
    if (seen.has(caseId)) continue
    seen.add(caseId)
    cases.push({
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

/** Parse property address from RealTDM case details HTML (summary section). */
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

function parseDetails(html: string): Pick<MiamiDadeCase, 'openingBid' | 'propertyAddress' | 'saleDate' | 'status'> {
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
  url: string,
  body: URLSearchParams,
  cookie: string
): Promise<{ html: string; cookie: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': BROWSER_UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html,application/xhtml+xml',
      Origin: 'https://miamidade.realtdm.com',
      Referer: REALTDM_CASE_LIST_URL,
      Cookie: cookie,
    },
    body: body.toString(),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`RealTDM HTTP ${res.status}`)
  }

  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
  const nextCookie = setCookies.length ? mergeCookies(cookie, setCookies) : cookie
  const html = await res.text()

  if (/Application Exception|CODE 500/i.test(html)) {
    throw new Error('RealTDM returned an application error')
  }

  return { html, cookie: nextCookie }
}

function buildListSearchBody(page: number, perPage: number): URLSearchParams {
  return new URLSearchParams({
    filterPageNumber: String(page),
    filterFiltered: '1',
    sectionRouteCode: '',
    isPublic: '1',
    filtercasestatus: REALTDM_ACTIVE_STATUS_IDS.join(','),
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

async function fetchCaseDetails(caseId: string, cookie: string): Promise<MiamiDadeCase | null> {
  const body = new URLSearchParams({
    caseID: caseId,
    openCaseList: '',
    isPublic: '1',
  })

  const { html } = await realTdmPost(REALTDM_CASE_DETAILS_URL, body, cookie)
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
    caseId,
    caseNumber: caseNumberMatch?.[1]?.trim() ?? '',
    parcelNumber,
    parcelNormalized: normalizeParcelNumber(parcelNumber),
    saleDate: details.saleDate,
    openingBid: details.openingBid,
    propertyAddress: details.propertyAddress,
    status: details.status,
  }
}

/** Format 13-digit folio as Miami-Dade dashed parcel when possible */
function formatParcelFromFolio(folio: string): string {
  const d = folio.replace(/\D/g, '')
  if (d.length !== 13) return d
  return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 9)}-${d.slice(9, 13)}`
}

function mergeListAndDetails(
  listCase: Omit<MiamiDadeCase, 'openingBid' | 'propertyAddress'>,
  detailed: MiamiDadeCase | null
): MiamiDadeCase {
  if (!detailed) {
    return {
      ...listCase,
      openingBid: null,
      propertyAddress: 'Address not available',
    }
  }

  const propertyAddress =
    detailed.propertyAddress !== 'Address not available'
      ? detailed.propertyAddress
      : 'Address not available'

  return {
    ...listCase,
    ...detailed,
    caseNumber: detailed.caseNumber || listCase.caseNumber,
    parcelNumber: detailed.parcelNumber || listCase.parcelNumber,
    parcelNormalized: detailed.parcelNormalized || listCase.parcelNormalized,
    saleDate: detailed.saleDate || listCase.saleDate,
    status: detailed.status || listCase.status,
    propertyAddress,
  }
}

async function enrichCasesWithDetails(
  listCases: Omit<MiamiDadeCase, 'openingBid' | 'propertyAddress'>[],
  cookie: string
): Promise<MiamiDadeCase[]> {
  const toEnrich = listCases.slice(0, MAX_DETAIL_ENRICHMENT)
  const remainder = listCases.slice(MAX_DETAIL_ENRICHMENT)

  const enriched = await runWithConcurrency(
    toEnrich,
    DETAIL_FETCH_CONCURRENCY,
    async listCase => {
      try {
        const detailed = await fetchCaseDetails(listCase.caseId, cookie)
        return mergeListAndDetails(listCase, detailed)
      } catch {
        return mergeListAndDetails(listCase, null)
      }
    }
  )

  const rest = remainder.map(listCase => mergeListAndDetails(listCase, null))

  return [...enriched, ...rest]
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
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
  perPage: number,
  cookie: string
): Promise<{ cases: Omit<MiamiDadeCase, 'openingBid' | 'propertyAddress'>[]; cookie: string }> {
  const seen = new Set<string>()
  const all: Omit<MiamiDadeCase, 'openingBid' | 'propertyAddress'>[] = []
  let currentCookie = cookie
  let totalPages = 1

  for (let page = 1; page <= totalPages; page++) {
    const { html, cookie: nextCookie } = await realTdmPost(
      REALTDM_CASE_LIST_URL,
      buildListSearchBody(page, perPage),
      currentCookie
    )
    currentCookie = nextCookie
    if (page === 1) totalPages = parseTotalPages(html)

    for (const listCase of parseListCases(html)) {
      if (seen.has(listCase.caseId)) continue
      seen.add(listCase.caseId)
      all.push(listCase)
    }
  }

  return { cases: all, cookie: currentCookie }
}

/** Fetch active tax deed cases from RealTDM public search (all result pages). */
export async function fetchMiamiDadeTaxDeedCases(perPage = 100): Promise<{
  cases: MiamiDadeCase[]
  count: number
  detailsEnriched: number
  totalListed: number
}> {
  const { cases: listCases, cookie } = await fetchAllListCases(perPage, '')
  const cases = await enrichCasesWithDetails(listCases, cookie)
  const detailsEnriched = Math.min(listCases.length, MAX_DETAIL_ENRICHMENT)

  return {
    cases,
    count: cases.length,
    detailsEnriched,
    totalListed: listCases.length,
  }
}
