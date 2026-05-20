/**
 * Miami-Dade Clerk RealTDM public tax deed case search.
 * https://miamidade.realtdm.com/public/cases/list
 */

export const REALTDM_CASE_LIST_URL = 'https://miamidade.realtdm.com/public/cases/list'
export const REALTDM_CASE_DETAILS_URL = 'https://miamidade.realtdm.com/public/cases/details'

/** RealTDM filtercasestatus values */
export const REALTDM_RESALE_STATUS_IDS = ['448', '449'] as const

export const REALTDM_RESALE_STATUS_LABELS = [
  'ACTIVE - RESALE 30DAY (1 ADV)',
  'ACTIVE - RESALE FULL (4 ADV)',
] as const

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

function parseDetails(html: string): Pick<MiamiDadeCase, 'openingBid' | 'propertyAddress' | 'saleDate' | 'status'> {
  const openingBidMatch = html.match(
    /<div class="title">Opening Bid<\/div>\s*<div class="value">([^<]+)/i
  )
  const openingBid = openingBidMatch ? parseMoney(openingBidMatch[1]) : null

  const addressMatch = html.match(
    /<div class="data-label">Property Address<\/div>\s*<div class="data-value[^"]*">([\s\S]*?)<\/div>/i
  )
  let propertyAddress = addressMatch ? stripTags(addressMatch[1]) : ''
  propertyAddress = propertyAddress.replace(/,?\s*FL\s*$/i, '').trim()
  if (!propertyAddress || /no address/i.test(propertyAddress)) {
    propertyAddress = 'Address not available'
  }

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

function buildListSearchBody(perPage = 100): URLSearchParams {
  return new URLSearchParams({
    filterPageNumber: '1',
    filterFiltered: '1',
    sectionRouteCode: '',
    isPublic: '1',
    filtercasestatus: REALTDM_RESALE_STATUS_IDS.join(','),
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

async function enrichCasesWithDetails(
  listCases: Omit<MiamiDadeCase, 'openingBid' | 'propertyAddress'>[],
  cookie: string
): Promise<MiamiDadeCase[]> {
  const results: MiamiDadeCase[] = []

  for (const listCase of listCases) {
    try {
      const detailed = await fetchCaseDetails(listCase.caseId, cookie)
      if (detailed) {
        results.push({
          ...listCase,
          ...detailed,
          caseNumber: detailed.caseNumber || listCase.caseNumber,
          parcelNumber: detailed.parcelNumber || listCase.parcelNumber,
          parcelNormalized:
            detailed.parcelNormalized || listCase.parcelNormalized,
          saleDate: detailed.saleDate || listCase.saleDate,
          status: detailed.status || listCase.status,
        })
      } else {
        results.push({
          ...listCase,
          openingBid: null,
          propertyAddress: 'Address not available',
        })
      }
    } catch {
      results.push({
        ...listCase,
        openingBid: null,
        propertyAddress: 'Address not available',
      })
    }
  }

  return results
}

/** Fetch active resale tax deed cases from RealTDM public search. */
export async function fetchMiamiDadeTaxDeedCases(perPage = 100): Promise<{
  cases: MiamiDadeCase[]
  count: number
}> {
  let cookie = ''
  const { html, cookie: listCookie } = await realTdmPost(
    REALTDM_CASE_LIST_URL,
    buildListSearchBody(perPage),
    cookie
  )
  cookie = listCookie

  const listCases = parseListCases(html)
  const cases = await enrichCasesWithDetails(listCases, cookie)

  return { cases, count: cases.length }
}
