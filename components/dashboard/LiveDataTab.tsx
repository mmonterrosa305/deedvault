'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { MiamiDadeProperty } from '@/lib/miami-dade-api'
import { REALFORECLOSE_URL } from '@/lib/miami-dade-api'
import {
  countyBaseUrl,
  FL_REALTDM_COUNTIES,
  FL_REALTDM_COUNTY_COUNT,
  type RealTdmCase,
} from '@/lib/realtdm'
import {
  BID4ASSETS_HOME_URL,
  type Bid4AssetsListing,
} from '@/lib/bid4assets'
import {
  GOVEASE_HOME_URL,
  type GovEaseListing,
} from '@/lib/govease'
import { SRI_HOME_URL, type SriListing } from '@/lib/sri'
import {
  REALFORECLOSE_SALE_TAXDEED,
  type RealForecloseCountyCount,
  type RealForecloseListing,
} from '@/lib/realforeclose'
import type { ForeclosureListing } from '@/lib/foreclosure-listing'
import {
  collectForeclosureCounties,
  filterAndSortForeclosureListings,
  filterTaxDeedTabListings,
} from '@/lib/foreclosure-feed'
import ForeclosureListingCard from '@/components/dashboard/ForeclosureListingCard'
import ForeclosurePropertyModal from '@/components/listing/ForeclosurePropertyModal'
import { fmt } from '@/lib/listings'
import { mergeLiveData, type LiveDataRecord } from '@/lib/live-data-merge'
import {
  bidToAssessedRatio,
  collectFeedCounties,
  defaultLiveDataFilters,
  feedItemKey,
  feedItemState,
  filterAndSortFeedItems,
  formatBidToAssessedPct,
  isGoodDealRatio,
  type LiveDataFeedItem,
  type LiveDataFilterState,
} from '@/lib/live-data-feed'
import LivePropertyModal from '@/components/listing/LivePropertyModal'
import LiveFeedPropertyModal from '@/components/listing/LiveFeedPropertyModal'
import LiveDataLoadProgress from '@/components/dashboard/LiveDataLoadProgress'
import LiveDataFilters from '@/components/dashboard/LiveDataFilters'
import DataFreshnessBar from '@/components/dashboard/DataFreshnessBar'
import { withRefreshParam } from '@/lib/cached-api'
import { oldestCachedAt } from '@/lib/format-data-age'

type CacheFields = { cachedAt?: number; fromCache?: boolean }

type PropertiesResponse = {
  properties: MiamiDadeProperty[]
  source?: 'primary' | 'fallback'
  error?: string
}

type CountyCasesResponse = CacheFields & {
  cases: RealTdmCase[]
  totalListed?: number
  detailsEnriched?: number
  error?: string
}

type GovEaseResponse = CacheFields & {
  listings: GovEaseListing[]
  sheetCount?: number
  liveCount?: number
  error?: string
}

type Bid4AssetsResponse = CacheFields & {
  listings: Bid4AssetsListing[]
  calendarCount?: number
  searchCount?: number
  error?: string
}

type SriResponse = CacheFields & {
  listings: SriListing[]
  countyCount?: number
  error?: string
}

type RealForecloseResponse = CacheFields & {
  listings: RealForecloseListing[]
  datesScanned?: number
  datesWithAuctions?: number
  countyCounts?: RealForecloseCountyCount[]
  countiesScanned?: number
  countiesWithListings?: number
  error?: string
}

type MichiganTaxDeedResponse = CacheFields & {
  listings: ForeclosureListing[]
  error?: string
}

const MI_TAX_DEED_EXTRA_SOURCES = new Set(['tax-sale.info', 'Wayne Treasurer'])

type TaxDeedsRegion = 'florida' | 'michigan'

const REGION_TABS: { id: TaxDeedsRegion; label: string }[] = [
  { id: 'florida', label: 'Florida' },
  { id: 'michigan', label: 'Michigan' },
]

function parseRegionParam(value: string | null): TaxDeedsRegion | null {
  if (value === 'florida' || value === 'michigan') return value
  return null
}

function LiveDataTabContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [region, setRegion] = useState<TaxDeedsRegion>('florida')
  const [records, setRecords] = useState<LiveDataRecord[]>([])
  const [goveaseListings, setGovEaseListings] = useState<GovEaseListing[]>([])
  const [bid4assetsListings, setBid4assetsListings] = useState<Bid4AssetsListing[]>([])
  const [sriListings, setSriListings] = useState<SriListing[]>([])
  const [realforecloseListings, setRealforecloseListings] = useState<RealForecloseListing[]>([])
  const [miTaxDeedListings, setMiTaxDeedListings] = useState<ForeclosureListing[]>([])
  const [loadingMiTaxDeeds, setLoadingMiTaxDeeds] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [propertySource, setPropertySource] = useState<'primary' | 'fallback' | null>(null)
  const [caseCount, setCaseCount] = useState(0)
  const [detailsEnriched, setDetailsEnriched] = useState(0)
  const [goveaseSheetCount, setGovEaseSheetCount] = useState(0)
  const [goveaseLiveCount, setGovEaseLiveCount] = useState(0)
  const [loadedCountyCount, setLoadedCountyCount] = useState(0)
  const [loadingParcels, setLoadingParcels] = useState(false)
  const [loadingGovEase, setLoadingGovEase] = useState(false)
  const [loadingBid4Assets, setLoadingBid4Assets] = useState(false)
  const [loadingSri, setLoadingSri] = useState(false)
  const [loadingRealForeclose, setLoadingRealForeclose] = useState(false)
  const [realforecloseDatesWithAuctions, setRealforecloseDatesWithAuctions] = useState(0)
  const [realforecloseCountyCounts, setRealforecloseCountyCounts] = useState<
    RealForecloseCountyCount[]
  >([])
  const [bid4assetsCalendarCount, setBid4assetsCalendarCount] = useState(0)
  const [bid4assetsSearchCount, setBid4assetsSearchCount] = useState(0)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<LiveDataFilterState>({
    ...defaultLiveDataFilters,
    state: 'FL',
  })
  const [selectedFeed, setSelectedFeed] = useState<LiveDataFeedItem | null>(null)
  const [selectedMiListing, setSelectedMiListing] = useState<ForeclosureListing | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const loadGen = useRef(0)

  const syncTaxDeedsUrl = useCallback(
    (next: TaxDeedsRegion) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', 'live')
      params.set('region', next)
      router.replace(`/dashboard?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  useEffect(() => {
    const urlRegion = parseRegionParam(searchParams.get('region'))
    if (urlRegion) setRegion(urlRegion)
  }, [searchParams])

  const selectRegion = useCallback(
    (next: TaxDeedsRegion) => {
      setRegion(next)
      syncTaxDeedsUrl(next)
    },
    [syncTaxDeedsUrl]
  )

  useEffect(() => {
    setFilters(f => ({
      ...f,
      state: region === 'michigan' ? 'MI' : 'FL',
      county: '',
    }))
    setSelectedFeed(null)
    setSelectedMiListing(null)
  }, [region])

  const loadAll = useCallback(async (refresh = false) => {
    const gen = ++loadGen.current

    async function loadCounty(county: (typeof FL_REALTDM_COUNTIES)[number]) {
      if (gen !== loadGen.current) {
        return { cases: [] as RealTdmCase[], listed: 0, enriched: 0, err: true, cachedAt: undefined }
      }

      try {
        const res = await fetch(withRefreshParam(`/api/realtdm/county/${county.key}`, refresh))
        const data = (await res.json()) as CountyCasesResponse
        if (!res.ok) throw new Error(data.error ?? `${county.name} failed`)

        return {
          cases: data.cases ?? [],
          listed: data.totalListed ?? 0,
          enriched: data.detailsEnriched ?? 0,
          err: false,
          cachedAt: data.cachedAt,
        }
      } catch {
        return { cases: [] as RealTdmCase[], listed: 0, enriched: 0, err: true, cachedAt: undefined }
      } finally {
        if (gen === loadGen.current) {
          setLoadedCountyCount(prev => prev + 1)
        }
      }
    }

    async function loadBid4Assets(): Promise<Bid4AssetsResponse & { ok: boolean }> {
      setLoadingBid4Assets(true)
      try {
        const res = await fetch('/api/bid4assets')
        const data = (await res.json()) as Bid4AssetsResponse
        if (!res.ok) throw new Error(data.error ?? 'Bid4Assets failed')
        if (gen === loadGen.current) {
          setBid4assetsListings(data.listings ?? [])
          setBid4assetsCalendarCount(data.calendarCount ?? 0)
          setBid4assetsSearchCount(data.searchCount ?? 0)
        }
        return { ...data, ok: true }
      } catch (err) {
        if (gen === loadGen.current) setBid4assetsListings([])
        const message = err instanceof Error ? err.message : 'Bid4Assets fetch failed'
        return {
          ok: false,
          error: message,
          listings: [],
          calendarCount: 0,
          searchCount: 0,
        }
      } finally {
        if (gen === loadGen.current) setLoadingBid4Assets(false)
      }
    }

    async function loadSri(): Promise<SriResponse & { ok: boolean }> {
      setLoadingSri(true)
      try {
        const res = await fetch('/api/sri')
        const data = (await res.json()) as SriResponse
        if (!res.ok) throw new Error(data.error ?? 'SRI failed')
        if (gen === loadGen.current) setSriListings(data.listings ?? [])
        return { ...data, ok: true }
      } catch (err) {
        if (gen === loadGen.current) setSriListings([])
        const message = err instanceof Error ? err.message : 'SRI fetch failed'
        return { ok: false, error: message, listings: [], countyCount: 0 }
      } finally {
        if (gen === loadGen.current) setLoadingSri(false)
      }
    }

    async function loadRealForeclose(): Promise<RealForecloseResponse & { ok: boolean }> {
      console.log('Fetching RealForeclose...')
      setLoadingRealForeclose(true)
      try {
        const res = await fetch(withRefreshParam('/api/realforeclose', refresh), {
          signal: AbortSignal.timeout(300_000),
        })
        const data = (await res.json()) as RealForecloseResponse
        if (!res.ok) throw new Error(data.error ?? 'RealForeclose failed')
        const count = data.listings?.length ?? 0
        const byCounty = (data.countyCounts ?? [])
          .filter(c => c.count > 0)
          .map(c => `${c.county} ${c.count}`)
          .join(' · ')
        console.log(
          `RealForeclose fetch complete: ${count} listings` +
            (byCounty ? ` (${byCounty})` : '')
        )
        return { ...data, ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'RealForeclose fetch failed'
        console.log('RealForeclose fetch complete: 0 listings (error)', message)
        return {
          ok: false,
          error: message,
          listings: [],
          datesScanned: 0,
          datesWithAuctions: 0,
          countyCounts: [],
          countiesScanned: 0,
          countiesWithListings: 0,
        }
      } finally {
        if (gen === loadGen.current) setLoadingRealForeclose(false)
      }
    }

    async function loadMichiganTaxDeeds(): Promise<MichiganTaxDeedResponse & { ok: boolean }> {
      setLoadingMiTaxDeeds(true)
      try {
        const res = await fetch(withRefreshParam('/api/michigan-foreclosures', refresh))
        const data = (await res.json()) as MichiganTaxDeedResponse
        if (!res.ok) throw new Error(data.error ?? 'Michigan tax deeds failed')
        const taxDeedOnly = filterTaxDeedTabListings(data.listings ?? []).filter(row =>
          MI_TAX_DEED_EXTRA_SOURCES.has(row.sourceLabel)
        )
        if (gen === loadGen.current) setMiTaxDeedListings(taxDeedOnly)
        return { ...data, listings: taxDeedOnly, ok: true }
      } catch (err) {
        if (gen === loadGen.current) setMiTaxDeedListings([])
        const message = err instanceof Error ? err.message : 'Michigan tax deeds failed'
        return { ok: false, error: message, listings: [] }
      } finally {
        if (gen === loadGen.current) setLoadingMiTaxDeeds(false)
      }
    }

    async function loadGovEase(): Promise<GovEaseResponse & { ok: boolean }> {
      setLoadingGovEase(true)
      try {
        const res = await fetch(withRefreshParam('/api/govease', refresh))
        const data = (await res.json()) as GovEaseResponse
        if (!res.ok) throw new Error(data.error ?? 'GovEase failed')
        if (gen === loadGen.current) {
          setGovEaseListings(data.listings ?? [])
          setGovEaseSheetCount(data.sheetCount ?? 0)
          setGovEaseLiveCount(data.liveCount ?? 0)
        }
        return { ...data, ok: true }
      } catch (err) {
        if (gen === loadGen.current) setGovEaseListings([])
        const message = err instanceof Error ? err.message : 'GovEase fetch failed'
        return { ok: false, error: message, listings: [], sheetCount: 0, liveCount: 0 }
      } finally {
        if (gen === loadGen.current) setLoadingGovEase(false)
      }
    }

    async function load() {
      setLoading(true)
      setError(null)
      setLoadedCountyCount(0)
      setLoadingParcels(false)
      setLoadingGovEase(true)
      setLoadingBid4Assets(true)
      setLoadingSri(true)
      setLoadingRealForeclose(true)
      setRecords([])
      setGovEaseListings([])
      setBid4assetsListings([])
      setSriListings([])
      setRealforecloseListings([])
      setMiTaxDeedListings([])
      setLoadingMiTaxDeeds(true)
      setCaseCount(0)
      setDetailsEnriched(0)
      setGovEaseSheetCount(0)
      setGovEaseLiveCount(0)
      setBid4assetsCalendarCount(0)
      setBid4assetsSearchCount(0)
      setRealforecloseDatesWithAuctions(0)
      setRealforecloseCountyCounts([])

      setLoadingParcels(true)

      async function loadProperties(): Promise<{
        properties: MiamiDadeProperty[]
        ok: boolean
        error?: string
        source?: 'primary' | 'fallback'
      }> {
        try {
          const propsRes = await fetch('/api/miami-dade/properties', { cache: 'no-store' })
          const propsData = (await propsRes.json()) as PropertiesResponse
          return {
            properties: propsRes.ok ? (propsData.properties ?? []) : [],
            ok: propsRes.ok,
            error: propsData.error,
            source: propsData.source,
          }
        } catch {
          return { properties: [], ok: false, error: 'Failed to load parcel data' }
        }
      }

      const [
        countyResults,
        goveaseResult,
        bid4assetsResult,
        sriResult,
        realforecloseResult,
        miTaxDeedResult,
        propsResult,
      ] = await Promise.all([
        Promise.all(FL_REALTDM_COUNTIES.map(county => loadCounty(county))),
        loadGovEase(),
        loadBid4Assets(),
        loadSri(),
        loadRealForeclose(),
        loadMichiganTaxDeeds(),
        loadProperties(),
      ])

      if (gen !== loadGen.current) return

      const properties = propsResult.properties
      const propsOk = propsResult.ok
      const propsErr = propsResult.error
      if (propsOk) setPropertySource(propsResult.source ?? null)
      else setPropertySource(null)

      setGovEaseListings(goveaseResult.listings ?? [])
      setGovEaseSheetCount(goveaseResult.sheetCount ?? 0)
      setGovEaseLiveCount(goveaseResult.liveCount ?? 0)
      setBid4assetsListings(bid4assetsResult.listings ?? [])
      setBid4assetsCalendarCount(bid4assetsResult.calendarCount ?? 0)
      setBid4assetsSearchCount(bid4assetsResult.searchCount ?? 0)
      setSriListings(sriResult.listings ?? [])
      setRealforecloseListings(
        (realforecloseResult.listings ?? []).filter(
          row => row.auctionType === REALFORECLOSE_SALE_TAXDEED
        )
      )
      setRealforecloseDatesWithAuctions(realforecloseResult.datesWithAuctions ?? 0)
      setRealforecloseCountyCounts(realforecloseResult.countyCounts ?? [])

      const allCases = countyResults.flatMap(r => r.cases)
      const totalListed = countyResults.reduce((n, r) => n + r.listed, 0)
      const enriched = countyResults.reduce((n, r) => n + r.enriched, 0)
      const failedCounties = countyResults.filter(r => r.err).length

      setRecords(mergeLiveData(allCases, properties))
      setCaseCount(totalListed)
      setDetailsEnriched(enriched)

      const warnings: string[] = []
      if (failedCounties > 0) {
        warnings.push(`${failedCounties} RealTDM county source${failedCounties !== 1 ? 's' : ''} unavailable`)
      }
      if (!goveaseResult.ok) {
        warnings.push('GovEase schedule unavailable')
      }
      if (!bid4assetsResult.ok) {
        warnings.push('Bid4Assets listings unavailable')
      }
      if (!sriResult.ok) {
        warnings.push('SRI listings unavailable')
      }
      if (!realforecloseResult.ok) {
        warnings.push('RealForeclose listings unavailable')
      }
      if (!miTaxDeedResult.ok) {
        warnings.push('Michigan tax-sale / Wayne listings unavailable')
      }
      if (!propsOk) {
        warnings.push(`Property data unavailable: ${propsErr}`)
      }
      const goveaseTotal = goveaseResult.listings?.length ?? 0
      const bid4assetsTotal = bid4assetsResult.listings?.length ?? 0
      const sriTotal = sriResult.listings?.length ?? 0
      const realforecloseTotal = realforecloseResult.listings?.length ?? 0
      if (
        allCases.length === 0 &&
        failedCounties === FL_REALTDM_COUNTY_COUNT &&
        goveaseTotal === 0 &&
        bid4assetsTotal === 0 &&
        sriTotal === 0 &&
        realforecloseTotal === 0
      ) {
        setError('Failed to load tax deed cases from all sources')
      } else if (warnings.length > 0) {
        setError(warnings.join(' · '))
      }

      setLoadingParcels(false)
      setLoading(false)

      setLastUpdatedAt(
        oldestCachedAt([
          ...countyResults.map(r => r.cachedAt),
          goveaseResult.cachedAt,
          realforecloseResult.cachedAt,
          miTaxDeedResult.cachedAt,
        ]) ?? Date.now()
      )
    }

    await load()
  }, [])

  useEffect(() => {
    loadAll(false)
    return () => {
      loadGen.current += 1
    }
  }, [loadAll])

  const feedItems = useMemo((): LiveDataFeedItem[] => {
    const rfTaxDeed = realforecloseListings.filter(
      row => row.auctionType === REALFORECLOSE_SALE_TAXDEED
    )
    return [
      ...records.map(record => ({ kind: 'realtdm' as const, record })),
      ...goveaseListings.map(listing => ({ kind: 'govease' as const, listing })),
      ...bid4assetsListings.map(listing => ({ kind: 'bid4assets' as const, listing })),
      ...sriListings.map(listing => ({ kind: 'sri' as const, listing })),
      ...rfTaxDeed.map(listing => ({
        kind: 'realforeclose' as const,
        listing,
      })),
    ]
  }, [records, goveaseListings, bid4assetsListings, sriListings, realforecloseListings])

  const flFeedItems = useMemo(
    () => feedItems.filter(item => feedItemState(item) === 'FL'),
    [feedItems]
  )
  const miFeedItems = useMemo(
    () => feedItems.filter(item => feedItemState(item) === 'MI'),
    [feedItems]
  )

  const regionFilters = useMemo(
    (): LiveDataFilterState => ({
      ...filters,
      state: region === 'michigan' ? 'MI' : 'FL',
    }),
    [filters, region]
  )

  const activeFeedItems = region === 'florida' ? flFeedItems : miFeedItems

  const filteredMiTaxDeeds = useMemo(
    () =>
      region === 'michigan'
        ? filterAndSortForeclosureListings(miTaxDeedListings, regionFilters, q)
        : [],
    [miTaxDeedListings, regionFilters, q, region]
  )

  const availableCounties = useMemo(() => {
    const fromFeed = collectFeedCounties(
      activeFeedItems,
      region === 'michigan' ? 'MI' : 'FL'
    )
    if (region === 'michigan') {
      const fromMiCards = collectForeclosureCounties(miTaxDeedListings)
      return [...new Set([...fromFeed, ...fromMiCards])].sort((a, b) => a.localeCompare(b))
    }
    return fromFeed
  }, [activeFeedItems, miTaxDeedListings, region])

  useEffect(() => {
    if (filters.county && !availableCounties.includes(filters.county)) {
      setFilters(f => ({ ...f, county: '' }))
    }
  }, [availableCounties, filters.county, filters.state])

  const upcomingCount = records.length
  const goveaseCount = goveaseListings.length
  const bid4assetsCount = bid4assetsListings.length
  const sriCount = sriListings.length
  const realforecloseCount = realforecloseListings.length
  const realforecloseCountySummary = useMemo(() => {
    if (realforecloseCountyCounts.length === 0) return ''
    return realforecloseCountyCounts
      .filter(c => c.count > 0)
      .map(c => `${c.county} ${c.count}`)
      .join(' · ')
  }, [realforecloseCountyCounts])
  const flDisplayedCount = flFeedItems.length
  const miDisplayedCount = miFeedItems.length + miTaxDeedListings.length
  const totalDisplayed = region === 'florida' ? flDisplayedCount : miDisplayedCount

  const filtered = useMemo(
    () => filterAndSortFeedItems(activeFeedItems, regionFilters, q),
    [activeFeedItems, regionFilters, q]
  )

  const regionDisplayedCount = filtered.length + filteredMiTaxDeeds.length

  const progressTotal = FL_REALTDM_COUNTY_COUNT + 5
  const progressLoaded =
    loadedCountyCount +
    (loadingGovEase ? 0 : 1) +
    (loadingBid4Assets ? 0 : 1) +
    (loadingSri ? 0 : 1) +
    (loadingRealForeclose ? 0 : 1) +
    (loadingMiTaxDeeds ? 0 : 1)

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      {selectedFeed?.kind === 'realtdm' && (
        <LivePropertyModal
          record={selectedFeed.record}
          onClose={() => setSelectedFeed(null)}
        />
      )}
      {selectedFeed && selectedFeed.kind !== 'realtdm' && (
        <LiveFeedPropertyModal item={selectedFeed} onClose={() => setSelectedFeed(null)} />
      )}
      {selectedMiListing && region === 'michigan' && (
        <ForeclosurePropertyModal
          listing={selectedMiListing}
          onClose={() => setSelectedMiListing(null)}
        />
      )}
      <div className="mb-6">
        <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>
          {region === 'florida'
            ? 'FLORIDA · REALTDM + GOVEASE + REALFORECLOSE'
            : 'MICHIGAN · BID4ASSETS + SRI + TAX-SALE.INFO + WAYNE'}
        </p>
        <h2 className="font-display text-2xl sm:text-3xl tracking-wide mt-1" style={{ color: 'var(--text)' }}>
          LIVE TAX DEED CASES
        </h2>
        <p className="font-mono text-xs mt-2 max-w-2xl" style={{ color: 'var(--muted)' }}>
          {region === 'florida' ? (
            <>
              Upcoming tax deed resale auctions from Florida RealTDM counties, GovEase schedule and
              live parcels, and RealForeclose waiting tax deed sales (25 counties). Miami-Dade
              parcels merge with county GIS when the parcel number matches. Only cases with a sale
              date today or later are shown.
              {propertySource === 'fallback' &&
                ' (Miami-Dade ArcGIS using county backup endpoint.)'}
            </>
          ) : (
            <>
              Michigan tax forfeiture and tax deed auctions from Bid4Assets, SRI, tax-sale.info
              (Title Check), and Wayne County — 20 target counties. Only upcoming sales are shown.
            </>
          )}
        </p>
      </div>

      <DataFreshnessBar
        lastUpdatedAt={lastUpdatedAt}
        loading={loading}
        onRefresh={() => loadAll(true)}
      />

      <div
        className="flex gap-1 mb-4 border-b overflow-x-auto"
        style={{ borderColor: 'var(--border)' }}
      >
        {REGION_TABS.map(tab => {
          const active = region === tab.id
          const count = tab.id === 'florida' ? flDisplayedCount : miDisplayedCount
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectRegion(tab.id)}
              className="font-mono text-xs tracking-widest px-4 py-2 transition-all whitespace-nowrap"
              style={{
                color: active ? 'var(--gold)' : 'var(--muted)',
                borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              {tab.label.toUpperCase()}
              {!loading && count > 0 && (
                <span className="ml-2 opacity-80">({count})</span>
              )}
            </button>
          )
        })}
      </div>

      <div
        className={`flex gap-2 mb-6${loading ? ' opacity-50 pointer-events-none' : ''}`}
        aria-disabled={loading}
      >
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Filter by county, case #, parcel, address, or owner..."
          className="flex-1"
          style={{ height: '42px', fontSize: '14px' }}
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => setQ('')}
          className="font-mono text-xs px-4 rounded"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
            cursor: loading ? 'not-allowed' : 'pointer',
            height: '42px',
          }}
          disabled={loading}
        >
          CLEAR
        </button>
      </div>

      <LiveDataFilters
        filters={regionFilters}
        counties={availableCounties}
        disabled={loading}
        hideStateFilter
        onChange={setFilters}
        onReset={() =>
          setFilters({
            ...defaultLiveDataFilters,
            state: region === 'michigan' ? 'MI' : 'FL',
          })
        }
      />

      {loading && (
        <LiveDataLoadProgress
          loadedCount={progressLoaded}
          totalCount={progressTotal}
          loadingParcels={loadingParcels}
          loadingSourceNames={
            region === 'florida'
              ? [
                  ...(loadingParcels ? ['RealTDM'] : []),
                  ...(loadingGovEase ? ['GovEase'] : []),
                  ...(loadingRealForeclose ? ['RealForeclose'] : []),
                ]
              : [
                  ...(loadingBid4Assets ? ['Bid4Assets'] : []),
                  ...(loadingSri ? ['SRI'] : []),
                  ...(loadingMiTaxDeeds ? ['tax-sale.info'] : []),
                ]
          }
        />
      )}

      {error && !loading && totalDisplayed === 0 && (
        <div
          className="rounded-md px-4 py-8 text-center"
          style={{ background: 'var(--panel)', border: '1px solid rgba(232,122,90,0.3)' }}
        >
          <p className="font-mono text-xs" style={{ color: '#e87a5a' }}>{error}</p>
        </div>
      )}

      {!loading && (totalDisplayed > 0 || !error) && (
        <>
          {error && regionDisplayedCount > 0 && (
            <p className="font-mono text-xs mb-3" style={{ color: '#e87a5a' }}>{error}</p>
          )}
          {region === 'florida' && (
            <>
              <p
                className="font-mono text-xs mb-3 px-3 py-2 rounded"
                style={{
                  color: 'var(--muted)',
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                }}
              >
                <span style={{ color: 'var(--gold)' }}>{upcomingCount}</span> RealTDM upcoming
                {' · '}
                <span style={{ color: 'var(--gold)' }}>{goveaseCount}</span> GovEase listing
                {goveaseCount !== 1 ? 's' : ''}
                {goveaseCount > 0 && (
                  <>
                    {' '}
                    ({goveaseLiveCount} live parcel{goveaseLiveCount !== 1 ? 's' : ''}
                    {goveaseSheetCount > 0 ? ` · ${goveaseSheetCount} scheduled` : ''})
                  </>
                )}
                {' · '}
                <span style={{ color: 'var(--gold)' }}>{realforecloseCount}</span> RealForeclose
                listing{realforecloseCount !== 1 ? 's' : ''}
                {realforecloseCount > 0 && realforecloseDatesWithAuctions > 0 && (
                  <>
                    {' '}
                    ({realforecloseDatesWithAuctions} auction day
                    {realforecloseDatesWithAuctions !== 1 ? 's' : ''})
                  </>
                )}
              </p>
              {realforecloseCountySummary && (
                <p
                  className="font-mono text-[10px] mb-3 px-3 leading-relaxed"
                  style={{ color: 'var(--muted)' }}
                >
                  <span style={{ color: 'var(--gold)' }}>RealForeclose by county:</span>{' '}
                  {realforecloseCountySummary}
                </p>
              )}
              <p
                className="font-mono text-xs mb-3 px-3 py-2 rounded"
                style={{
                  color: 'var(--muted)',
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                }}
              >
                <span style={{ color: 'var(--text)' }}>{caseCount}</span> total RealTDM cases found
                {caseCount > upcomingCount && (
                  <>
                    {' '}
                    ({caseCount - upcomingCount} past sale
                    {caseCount - upcomingCount !== 1 ? 's' : ''} hidden)
                  </>
                )}
              </p>
            </>
          )}
          {region === 'michigan' && (
            <p
              className="font-mono text-xs mb-3 px-3 py-2 rounded"
              style={{
                color: 'var(--muted)',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ color: 'var(--gold)' }}>{bid4assetsCount}</span> Bid4Assets
              {' · '}
              <span style={{ color: 'var(--gold)' }}>{sriCount}</span> SRI
              {' · '}
              <span style={{ color: 'var(--gold)' }}>{miTaxDeedListings.length}</span> tax-sale /
              Wayne
            </p>
          )}
          <p className="font-mono text-xs mb-4" style={{ color: 'var(--muted)' }}>
            {q ? `${regionDisplayedCount} match${regionDisplayedCount !== 1 ? 'es' : ''} · ` : ''}
            {regionDisplayedCount} of {totalDisplayed} displayed
            {region === 'florida' && upcomingCount > 0 &&
              ` · BIDS/ADDRS: ${detailsEnriched} of ${upcomingCount}`}
            {region === 'florida' && propertySource != null &&
              ` · PARCELS: ${propertySource.toUpperCase()}`}
          </p>

          {regionDisplayedCount === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
              <p className="font-display text-3xl">
                {totalDisplayed === 0 ? 'NO UPCOMING SALES' : 'NO MATCHES'}
              </p>
              {region === 'florida' && totalDisplayed === 0 && caseCount > 0 && (
                <p className="font-mono text-xs mt-2">
                  All {caseCount} RealTDM cases have sale dates in the past.
                </p>
              )}
              {region === 'michigan' && totalDisplayed === 0 && (
                <p className="font-mono text-xs mt-2 max-w-md mx-auto">
                  No Michigan tax deed listings loaded. Try refresh or check back closer to the
                  county sale date.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* DO NOT CHANGE TO GRID - Cards must always be full-width horizontal */}
              <div className="space-y-3">
              {region === 'michigan' &&
                filteredMiTaxDeeds.map(listing => (
                  <ForeclosureListingCard
                    key={listing.id}
                    listing={listing}
                    onSelect={() => setSelectedMiListing(listing)}
                  />
                ))}
              {filtered.map(item =>
                item.kind === 'realtdm' ? (
                  <RealTdmCard
                    key={feedItemKey(item)}
                    record={item.record}
                    onSelect={() => setSelectedFeed(item)}
                  />
                ) : item.kind === 'govease' ? (
                  <GovEaseCard
                    key={feedItemKey(item)}
                    listing={item.listing}
                    onSelect={() => setSelectedFeed(item)}
                  />
                ) : item.kind === 'bid4assets' ? (
                  <Bid4AssetsCard
                    key={feedItemKey(item)}
                    listing={item.listing}
                    onSelect={() => setSelectedFeed(item)}
                  />
                ) : item.kind === 'sri' ? (
                  <SriCard
                    key={feedItemKey(item)}
                    listing={item.listing}
                    onSelect={() => setSelectedFeed(item)}
                  />
                ) : (
                  <RealForecloseCard
                    key={feedItemKey(item)}
                    listing={item.listing}
                    onSelect={() => setSelectedFeed(item)}
                  />
                )
              )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function feedCardStyle(isGoodDeal: boolean): CSSProperties {
  return {
    background: isGoodDeal ? 'var(--gold-glow)' : 'var(--panel)',
    border: `1px solid ${isGoodDeal ? 'rgba(201,168,76,0.45)' : 'var(--border)'}`,
  }
}

function feedCardHoverBorder(isGoodDeal: boolean): string {
  return isGoodDeal ? 'rgba(201,168,76,0.65)' : 'var(--gold-dim)'
}

function FeedCardShell({
  isGoodDeal,
  onSelect,
  children,
}: {
  isGoodDeal: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className="rounded-md p-4 transition-all cursor-pointer"
      style={feedCardStyle(isGoodDeal)}
      onMouseEnter={e => (e.currentTarget.style.borderColor = feedCardHoverBorder(isGoodDeal))}
      onMouseLeave={e =>
        (e.currentTarget.style.borderColor = isGoodDeal
          ? 'rgba(201,168,76,0.45)'
          : 'var(--border)')
      }
    >
      {children}
    </article>
  )
}

function GoodDealBadge() {
  return (
    <span
      className="font-mono text-[10px] px-2 py-0.5 rounded-sm"
      style={{
        background: 'var(--gold-glow)',
        color: 'var(--gold)',
        border: '1px solid rgba(201,168,76,0.45)',
      }}
    >
      GOOD DEAL
    </span>
  )
}

/** Prominent opening bid — matches LivePropertyModal hero styling. */
function OpeningBidHighlight({ openingBid }: { openingBid: number | null }) {
  return (
    <div
      className="mb-4 p-4 rounded-md text-center w-full"
      style={{ background: 'var(--gold-glow)', border: '1px solid rgba(201,168,76,0.35)' }}
    >
      <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: 'var(--muted)' }}>
        OPENING BID
      </p>
      <p className="font-display text-3xl tracking-wide" style={{ color: 'var(--gold)' }}>
        {openingBid != null ? fmt(openingBid) : '—'}
      </p>
    </div>
  )
}

function AssessedRatioBlock({
  openingBid,
  assessedValue,
}: {
  openingBid: number | null
  assessedValue: number | null
}) {
  const ratio = bidToAssessedRatio(openingBid, assessedValue)
  if (ratio == null) return null
  const isGoodDeal = isGoodDealRatio(ratio)
  return (
    <div className="text-right">
      <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
        % OF ASSESSED VALUE
      </p>
      <p
        className="font-mono text-sm mt-0.5"
        style={{ color: isGoodDeal ? 'var(--gold)' : 'var(--text)' }}
      >
        {formatBidToAssessedPct(ratio)}
      </p>
    </div>
  )
}

function RealTdmCard({
  record,
  onSelect,
}: {
  record: LiveDataRecord
  onSelect: () => void
}) {
  const r = record
  const openingBid = r.case.openingBid
  const assessedValue = r.assessedValue
  const ratio = bidToAssessedRatio(openingBid, assessedValue)
  const isGoodDeal = isGoodDealRatio(ratio)
  return (
    <FeedCardShell isGoodDeal={isGoodDeal} onSelect={onSelect}>
      <OpeningBidHighlight openingBid={openingBid} />
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="font-mono text-xs" style={{ color: '#5a9fe8' }}>
              {r.case.county.toUpperCase()} · FL · REALTDM
            </p>
            {isGoodDeal && <GoodDealBadge />}
            <span
              className="font-mono text-[10px] px-2 py-0.5 rounded-sm"
              style={{
                background: 'var(--gold-glow)',
                color: 'var(--gold)',
                border: '1px solid rgba(201,168,76,0.25)',
              }}
            >
              {r.case.status}
            </span>
            {r.property && (
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded-sm"
                style={{
                  background: 'rgba(58,170,110,0.12)',
                  color: '#3aaa6e',
                  border: '1px solid rgba(58,170,110,0.25)',
                }}
              >
                PARCEL MATCHED
              </span>
            )}
          </div>
          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text)' }}>
            {r.displayAddress}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                CASE NUMBER
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                {r.case.caseNumber}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                PARCEL NUMBER
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                {r.case.parcelNumber}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                SALE DATE
              </p>
              <p className="font-mono text-xs mt-0.5">{r.case.saleDate}</p>
            </div>
            {r.displayOwner && (
              <div>
                <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                  OWNER (ARC GIS)
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                  {r.displayOwner}
                </p>
              </div>
            )}
            {r.assessedValue != null && (
              <div>
                <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                  TOTAL ASSESSED
                </p>
                <p className="font-mono text-xs mt-0.5">{fmt(r.assessedValue)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <AssessedRatioBlock openingBid={openingBid} assessedValue={assessedValue} />
          <a
            href={
              r.case.countyKey === 'miamidade'
                ? REALFORECLOSE_URL
                : `${countyBaseUrl({ key: r.case.countyKey, name: r.case.county, subdomain: r.case.subdomain })}/public/cases/list`
            }
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="font-mono text-xs tracking-widest px-4 py-2 rounded transition-all inline-block text-center"
            style={{
              background: 'var(--gold-glow)',
              border: '1px solid rgba(201,168,76,0.35)',
              color: 'var(--gold)',
            }}
          >
            {r.case.countyKey === 'miamidade'
              ? 'VIEW ON REALFORECLOSE →'
              : 'VIEW ON REALTDM →'}
          </a>
        </div>
      </div>
    </FeedCardShell>
  )
}

function Bid4AssetsCard({
  listing,
  onSelect,
}: {
  listing: Bid4AssetsListing
  onSelect: () => void
}) {
  const ratio = bidToAssessedRatio(listing.openingBid, null)
  const isGoodDeal = isGoodDealRatio(ratio)
  return (
    <FeedCardShell isGoodDeal={isGoodDeal} onSelect={onSelect}>
      <OpeningBidHighlight openingBid={listing.openingBid} />
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="font-mono text-xs" style={{ color: '#5a9fe8' }}>
              {listing.county.toUpperCase()} · MI · BID4ASSETS
            </p>
            {isGoodDeal && <GoodDealBadge />}
            {listing.source === 'search' && (
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded-sm"
                style={{
                  background: 'rgba(58,170,110,0.12)',
                  color: '#3aaa6e',
                  border: '1px solid rgba(58,170,110,0.25)',
                }}
              >
                LIVE AUCTION
              </span>
            )}
            {listing.source === 'calendar' && (
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded-sm"
                style={{
                  background: 'rgba(201,168,76,0.12)',
                  color: 'var(--gold)',
                  border: '1px solid rgba(201,168,76,0.25)',
                }}
              >
                SCHEDULED
              </span>
            )}
          </div>
          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text)' }}>
            {listing.address}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                COUNTY
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                {listing.county}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                STATE
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                {listing.state}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                SALE DATE
              </p>
              <p className="font-mono text-xs mt-0.5">{listing.saleDate}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <AssessedRatioBlock openingBid={listing.openingBid} assessedValue={null} />
          <a
            href={listing.auctionUrl ?? BID4ASSETS_HOME_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="font-mono text-xs tracking-widest px-4 py-2 rounded transition-all inline-block text-center"
            style={{
              background: 'var(--gold-glow)',
              border: '1px solid rgba(201,168,76,0.35)',
              color: 'var(--gold)',
            }}
          >
            VIEW ON BID4ASSETS →
          </a>
        </div>
      </div>
    </FeedCardShell>
  )
}

function SriCard({
  listing,
  onSelect,
}: {
  listing: SriListing
  onSelect: () => void
}) {
  const ratio = bidToAssessedRatio(listing.openingBid, null)
  const isGoodDeal = isGoodDealRatio(ratio)
  return (
    <FeedCardShell isGoodDeal={isGoodDeal} onSelect={onSelect}>
      <OpeningBidHighlight openingBid={listing.openingBid} />
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="font-mono text-xs" style={{ color: '#5a9fe8' }}>
              {listing.county.toUpperCase()} · MI · SRI
            </p>
            {isGoodDeal && <GoodDealBadge />}
            {listing.saleType && (
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded-sm"
                style={{
                  background: 'rgba(90,159,232,0.12)',
                  color: '#5a9fe8',
                  border: '1px solid rgba(90,159,232,0.25)',
                }}
              >
                {listing.saleType}
              </span>
            )}
            {listing.saleStatus && (
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded-sm"
                style={{
                  background: 'rgba(201,168,76,0.12)',
                  color: 'var(--gold)',
                  border: '1px solid rgba(201,168,76,0.25)',
                }}
              >
                {listing.saleStatus}
              </span>
            )}
          </div>
          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text)' }}>
            {listing.address}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                COUNTY
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                {listing.county}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                STATE
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                {listing.state}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                SALE DATE
              </p>
              <p className="font-mono text-xs mt-0.5">{listing.saleDate}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <AssessedRatioBlock openingBid={listing.openingBid} assessedValue={null} />
          <a
            href={listing.auctionUrl ?? SRI_HOME_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="font-mono text-xs tracking-widest px-4 py-2 rounded transition-all inline-block text-center"
            style={{
              background: 'var(--gold-glow)',
              border: '1px solid rgba(201,168,76,0.35)',
              color: 'var(--gold)',
            }}
          >
            VIEW ON SRI →
          </a>
        </div>
      </div>
    </FeedCardShell>
  )
}

function RealForecloseCard({
  listing,
  onSelect,
}: {
  listing: RealForecloseListing
  onSelect: () => void
}) {
  const ratio = bidToAssessedRatio(listing.openingBid, listing.assessedValue)
  const isGoodDeal = isGoodDealRatio(ratio)
  return (
    <FeedCardShell isGoodDeal={isGoodDeal} onSelect={onSelect}>
      <OpeningBidHighlight openingBid={listing.openingBid} />
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="font-mono text-xs" style={{ color: '#5a9fe8' }}>
              {listing.county.toUpperCase()} · FL · REALFORECLOSE
            </p>
            {isGoodDeal && <GoodDealBadge />}
            <span
              className="font-mono text-[10px] px-2 py-0.5 rounded-sm"
              style={{
                background: 'rgba(90,159,232,0.12)',
                color: '#5a9fe8',
                border: '1px solid rgba(90,159,232,0.25)',
              }}
            >
              {listing.auctionType}
            </span>
          </div>
          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text)' }}>
            {listing.address}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                COUNTY
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                {listing.county}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                STATE
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                {listing.state}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                CASE NUMBER
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                {listing.caseNumber}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                PARCEL ID
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                {listing.parcelId}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                AUCTION DATE & TIME
              </p>
              <p className="font-mono text-xs mt-0.5">{listing.auctionDateTime}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                ASSESSED VALUE
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                {listing.assessedValue != null ? fmt(listing.assessedValue) : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <AssessedRatioBlock
            openingBid={listing.openingBid}
            assessedValue={listing.assessedValue}
          />
          <a
            href={listing.auctionUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="font-mono text-xs tracking-widest px-4 py-2 rounded transition-all inline-block text-center"
            style={{
              background: 'var(--gold-glow)',
              border: '1px solid rgba(201,168,76,0.35)',
              color: 'var(--gold)',
            }}
          >
            VIEW ON REALFORECLOSE →
          </a>
        </div>
      </div>
    </FeedCardShell>
  )
}

function GovEaseCard({
  listing,
  onSelect,
}: {
  listing: GovEaseListing
  onSelect: () => void
}) {
  const href = GOVEASE_HOME_URL
  const ratio = bidToAssessedRatio(listing.openingBid, null)
  const isGoodDeal = isGoodDealRatio(ratio)
  return (
    <FeedCardShell isGoodDeal={isGoodDeal} onSelect={onSelect}>
      <OpeningBidHighlight openingBid={listing.openingBid} />
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="font-mono text-xs" style={{ color: '#5a9fe8' }}>
              {listing.county.toUpperCase()} · FL · GOVEASE
            </p>
            {isGoodDeal && <GoodDealBadge />}
            {listing.saleType && (
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded-sm"
                style={{
                  background: 'rgba(90,159,232,0.12)',
                  color: '#5a9fe8',
                  border: '1px solid rgba(90,159,232,0.25)',
                }}
              >
                {listing.saleType}
              </span>
            )}
            {listing.source === 'liveauction' && (
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded-sm"
                style={{
                  background: 'rgba(58,170,110,0.12)',
                  color: '#3aaa6e',
                  border: '1px solid rgba(58,170,110,0.25)',
                }}
              >
                LIVE PARCEL
              </span>
            )}
          </div>
          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text)' }}>
            {listing.address}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                COUNTY
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                {listing.county}
              </p>
            </div>
            {listing.parcelNumber && (
              <div>
                <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                  PARCEL NUMBER
                </p>
                <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                  {listing.parcelNumber}
                </p>
              </div>
            )}
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                SALE DATE
              </p>
              <p className="font-mono text-xs mt-0.5">{listing.saleDate}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <AssessedRatioBlock openingBid={listing.openingBid} assessedValue={null} />
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="font-mono text-xs tracking-widest px-4 py-2 rounded transition-all inline-block text-center"
            style={{
              background: 'var(--gold-glow)',
              border: '1px solid rgba(201,168,76,0.35)',
              color: 'var(--gold)',
            }}
          >
            VIEW ON GOVEASE →
          </a>
        </div>
      </div>
    </FeedCardShell>
  )
}

function LiveDataTabFallback() {
  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      <p className="font-mono text-xs text-center py-16" style={{ color: 'var(--muted)' }}>
        Loading tax deeds…
      </p>
    </div>
  )
}

export default function LiveDataTab() {
  return (
    <Suspense fallback={<LiveDataTabFallback />}>
      <LiveDataTabContent />
    </Suspense>
  )
}
