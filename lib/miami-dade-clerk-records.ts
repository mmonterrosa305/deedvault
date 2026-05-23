/**
 * Miami-Dade Clerk Official Records — LIS PENDENS and related filings.
 * @see https://www.miami-dadeclerk.com
 * @see https://onlineservices.miamidadeclerk.gov/officialrecords
 */

import { SALE_KIND_FORECLOSURE, type ForeclosureListing } from '@/lib/foreclosure-listing'
import { MIAMI_DADE_OFFICIAL_RECORDS_URL } from '@/lib/foreclosure-listing'

const CLERK_API = 'https://onlineservices.miamidadeclerk.gov/officialrecords/api'
const SEARCH_DAYS = 30
const PARTY_SEARCH_TERMS = ['LLC', 'BANK', 'TRUST', 'INC', 'CORP']

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
}

export type ClerkRecordingRow = {
  cfN_YEAR?: string
  cfN_SEQ?: string
  cfN_MASTER_ID?: number
  firsT_PARTY?: string
  seconD_PARTY?: string
  address?: string
  addressnounit?: string
  reC_DATE?: string
  doC_TYPE?: string
  legaL_DESCRIPTION?: string
  reC_BOOK?: string
  reC_PAGE?: string
  plaT_BOOK?: string
  plaT_PAGE?: string
}

type SearchInitResponse = {
  isValidSearch?: boolean
  qs?: string | null
}

type StandardRecordsResponse = {
  recordingModels?: ClerkRecordingRow[]
}

function formatMmDdYyyy(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}/${day}/${d.getFullYear()}`
}

function dateRange(): { from: string; to: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - SEARCH_DAYS)
  return { from: formatMmDdYyyy(start), to: formatMmDdYyyy(end) }
}

function isoFromRecDate(value: string | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return value
  const [, mo, da, yr] = m
  return `${yr}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`
}

function formatRecDateDisplay(iso: string, raw?: string): string {
  if (raw) {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }
  }
  if (!iso) return '—'
  const d = new Date(iso + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function parseMoney(value: string): number | null {
  const n = parseFloat(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

function buildAddress(row: ClerkRecordingRow): string {
  const addr = (row.addressnounit ?? row.address ?? '').trim()
  if (addr) return addr
  const legal = row.legaL_DESCRIPTION?.trim()
  return legal || '—'
}

function extractParcelFromLegal(legal: string | undefined): string {
  if (!legal) return '—'
  const folio = legal.match(/\b\d{13,25}\b/)
  return folio?.[0] ?? '—'
}

function extractCaseFromParties(row: ClerkRecordingRow): string {
  const parties = `${row.firsT_PARTY ?? ''} ${row.seconD_PARTY ?? ''}`
  const caseMatch = parties.match(/\d{4}-\d{6}-[A-Z]{2}-\d{2}/i)
  return caseMatch?.[0] ?? '—'
}

export function clerkRowToListing(
  row: ClerkRecordingRow,
  category: ForeclosureListing['category'],
  idPrefix: string
): ForeclosureListing {
  const iso = isoFromRecDate(row.reC_DATE)
  const cfn =
    row.cfN_YEAR && row.cfN_SEQ
      ? `${row.cfN_YEAR} R ${row.cfN_SEQ}`
      : row.cfN_MASTER_ID != null
        ? String(row.cfN_MASTER_ID)
        : '—'
  const masterId = row.cfN_MASTER_ID ?? 0

  return {
    id: `${idPrefix}-${masterId || cfn.replace(/\s+/g, '-')}`,
    category,
    county: 'Miami-Dade',
    countyKey: 'miamidade',
    state: 'FL',
    address: buildAddress(row),
    caseNumber: extractCaseFromParties(row) !== '—' ? extractCaseFromParties(row) : cfn,
    parcelId: extractParcelFromLegal(row.legaL_DESCRIPTION),
    openingBid: null,
    estimatedValue: parseMoney(row.legaL_DESCRIPTION ?? ''),
    eventDate: iso || '—',
    eventDateDisplay: formatRecDateDisplay(iso, row.reC_DATE),
    auctionType: SALE_KIND_FORECLOSURE,
    auctionSubtype: row.doC_TYPE?.trim() || null,
    sourceUrl: MIAMI_DADE_OFFICIAL_RECORDS_URL,
    sourceLabel: 'Miami-Dade Clerk Official Records',
  }
}

async function postJson<T>(url: string, body: object, recaptchaToken?: string): Promise<T | null> {
  const headers: Record<string, string> = {
    ...FETCH_HEADERS,
    'content-type': 'application/json; charset=utf-8',
  }
  if (recaptchaToken) headers['x-recaptcha-token'] = recaptchaToken

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function fetchStandardRecords(qs: string): Promise<ClerkRecordingRow[]> {
  const enc = encodeURIComponent(qs)
  try {
    const res = await fetch(
      `${CLERK_API}/SearchResults/getStandardRecords?qs=${enc}`,
      { headers: FETCH_HEADERS, cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = (await res.json()) as StandardRecordsResponse
    return data.recordingModels ?? []
  } catch {
    return []
  }
}

async function initStandardSearch(
  documentType: string,
  partyName: string,
  recaptchaToken?: string
): Promise<string | null> {
  const { from, to } = dateRange()
  const params = new URLSearchParams({
    partyName,
    dateRangeFrom: from,
    dateRangeTo: to,
    documentType,
    searchT: documentType,
    firstQuery: 'Y',
    searchtype: 'Name/Document',
  })

  const init = await postJson<SearchInitResponse>(
    `${CLERK_API}/home/standardsearch?${params}`,
    {},
    recaptchaToken
  )
  if (init?.isValidSearch && init.qs) return init.qs

  const advanced = await postJson<SearchInitResponse>(
    `${CLERK_API}/home/getAdvancedRecords`,
    {
      partyName1: partyName || 'A',
      documentType,
      dateRangeFrom: from,
      dateRangeTo: to,
      searchtype: 'Name/Document',
      lastName: partyName || '',
      companyName: partyName || '',
    },
    recaptchaToken
  )
  if (advanced?.isValidSearch && advanced.qs) return advanced.qs

  return null
}

export type ClerkSearchResult = {
  listings: ForeclosureListing[]
  qsUsed: boolean
  warning?: string
}

/** Search Miami-Dade Official Records by document type (e.g. LIS PENDENS - LIS). */
export async function searchMiamiDadeClerkRecords(options: {
  documentType: string
  category: ForeclosureListing['category']
  idPrefix: string
}): Promise<ClerkSearchResult> {
  const recaptchaToken = process.env.MIAMI_DADE_CLERK_RECAPTCHA_TOKEN?.trim()
  const presetQs =
    options.category === 'lis-pendens'
      ? process.env.MIAMI_DADE_CLERK_LIS_PENDENS_QS?.trim()
      : process.env.MIAMI_DADE_CLERK_PRE_FORECLOSURE_QS?.trim()

  if (presetQs) {
    const rows = await fetchStandardRecords(presetQs)
    return {
      listings: rows.map(r => clerkRowToListing(r, options.category, options.idPrefix)),
      qsUsed: true,
    }
  }

  const seen = new Set<string>()
  const listings: ForeclosureListing[] = []

  for (const term of PARTY_SEARCH_TERMS) {
    const qs = await initStandardSearch(options.documentType, term, recaptchaToken)
    if (!qs) continue
    const rows = await fetchStandardRecords(qs)
    for (const row of rows) {
      const listing = clerkRowToListing(row, options.category, options.idPrefix)
      if (seen.has(listing.id)) continue
      seen.add(listing.id)
      listings.push(listing)
    }
    if (listings.length >= 80) break
  }

  if (listings.length === 0) {
    return {
      listings: [],
      qsUsed: false,
      warning:
        'Miami-Dade Clerk search requires a valid session. Set MIAMI_DADE_CLERK_RECAPTCHA_TOKEN or paste a search QS from Official Records into MIAMI_DADE_CLERK_LIS_PENDENS_QS / MIAMI_DADE_CLERK_PRE_FORECLOSURE_QS in .env.local.',
    }
  }

  listings.sort((a, b) => {
    const da = Date.parse(a.eventDate)
    const db = Date.parse(b.eventDate)
    if (!Number.isNaN(da) && !Number.isNaN(db) && da !== db) return db - da
    return a.caseNumber.localeCompare(b.caseNumber)
  })

  return { listings, qsUsed: true }
}
