'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
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
  type RealForecloseCountyCount,
  type RealForecloseListing,
} from '@/lib/realforeclose'
import { fmt } from '@/lib/listings'
import { mergeLiveData, type LiveDataRecord } from '@/lib/live-data-merge'
import {
  bidToAssessedRatio,
  collectFeedCounties,
  defaultLiveDataFilters,
  feedItemKey,
  filterAndSortFeedItems,
  formatBidToAssessedPct,
  isGoodDealRatio,
  type LiveDataFeedItem,
  type LiveDataFilterState,
} from '@/lib/live-data-feed'
import LivePropertyModal from '@/components/listing/LivePropertyModal'
import LiveDataLoadProgress from '@/components/dashboard/LiveDataLoadProgress'
import LiveDataFilters from '@/components/dashboard/LiveDataFilters'

type PropertiesResponse = {
  properties: MiamiDadeProperty[]
  source?: 'primary' | 'fallback'
  error?: string
}

type CountyCasesResponse = {
  cases: RealTdmCase[]
  totalListed?: number
  detailsEnriched?: number
  error?: string
}

type GovEaseResponse = {
  listings: GovEaseListing[]
  sheetCount?: number
  liveCount?: number
  error?: string
}

type Bid4AssetsResponse = {
  listings: Bid4AssetsListing[]
  calendarCount?: number
  searchCount?: number
  error?: string
}

type SriResponse = {
  listings: SriListing[]
  countyCount?: number
  error?: string
}

type RealForecloseResponse = {
  listings: RealForecloseListing[]
  datesScanned?: number
  datesWithAuctions?: number
  countyCounts?: RealForecloseCountyCount[]
  countiesScanned?: number
  countiesWithListings?: number
  error?: string
}

export default function LiveDataTab() {
  const [records, setRecords] = useState<LiveDataRecord[]>([])
  const [goveaseListings, setGovEaseListings] = useState<GovEaseListing[]>([])
  const [bid4assetsListings, setBid4assetsListings] = useState<Bid4AssetsListing[]>([])
  const [sriListings, setSriListings] = useState<SriListing[]>([])
  const [realforecloseListings, setRealforecloseListings] = useState<RealForecloseListing[]>([])
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
  const [filters, setFilters] = useState<LiveDataFilterState>(defaultLiveDataFilters)
  const [selected, setSelected] = useState<LiveDataRecord | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCounty(county: (typeof FL_REALTDM_COUNTIES)[number]) {
      if (cancelled) return { cases: [] as RealTdmCase[], listed: 0, enriched: 0, err: true }

      try {
        const res = await fetch(`/api/realtdm/county/${county.key}`)
        const data = (await res.json()) as CountyCasesResponse
        if (!res.ok) throw new Error(data.error ?? `${county.name} failed`)

        return {
          cases: data.cases ?? [],
          listed: data.totalListed ?? 0,
          enriched: data.detailsEnriched ?? 0,
          err: false,
        }
      } catch {
        return { cases: [] as RealTdmCase[], listed: 0, enriched: 0, err: true }
      } finally {
        if (!cancelled) {
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
        if (!cancelled) {
          setBid4assetsListings(data.listings ?? [])
          setBid4assetsCalendarCount(data.calendarCount ?? 0)
          setBid4assetsSearchCount(data.searchCount ?? 0)
        }
        return { ...data, ok: true }
      } catch (err) {
        if (!cancelled) setBid4assetsListings([])
        const message = err instanceof Error ? err.message : 'Bid4Assets fetch failed'
        return {
          ok: false,
          error: message,
          listings: [],
          calendarCount: 0,
          searchCount: 0,
        }
      } finally {
        if (!cancelled) setLoadingBid4Assets(false)
      }
    }

    async function loadSri(): Promise<SriResponse & { ok: boolean }> {
      setLoadingSri(true)
      try {
        const res = await fetch('/api/sri')
        const data = (await res.json()) as SriResponse
        if (!res.ok) throw new Error(data.error ?? 'SRI failed')
        if (!cancelled) setSriListings(data.listings ?? [])
        return { ...data, ok: true }
      } catch (err) {
        if (!cancelled) setSriListings([])
        const message = err instanceof Error ? err.message : 'SRI fetch failed'
        return { ok: false, error: message, listings: [], countyCount: 0 }
      } finally {
        if (!cancelled) setLoadingSri(false)
      }
    }

    async function loadRealForeclose(): Promise<RealForecloseResponse & { ok: boolean }> {
      console.log('Fetching RealForeclose...')
      setLoadingRealForeclose(true)
      try {
        const res = await fetch('/api/realforeclose', {
          cache: 'no-store',
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
        if (!cancelled) setLoadingRealForeclose(false)
      }
    }

    async function loadGovEase(): Promise<GovEaseResponse & { ok: boolean }> {
      setLoadingGovEase(true)
      try {
        const res = await fetch('/api/govease')
        const data = (await res.json()) as GovEaseResponse
        if (!res.ok) throw new Error(data.error ?? 'GovEase failed')
        if (!cancelled) {
          setGovEaseListings(data.listings ?? [])
          setGovEaseSheetCount(data.sheetCount ?? 0)
          setGovEaseLiveCount(data.liveCount ?? 0)
        }
        return { ...data, ok: true }
      } catch (err) {
        if (!cancelled) setGovEaseListings([])
        const message = err instanceof Error ? err.message : 'GovEase fetch failed'
        return { ok: false, error: message, listings: [], sheetCount: 0, liveCount: 0 }
      } finally {
        if (!cancelled) setLoadingGovEase(false)
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
        propsResult,
      ] = await Promise.all([
        Promise.all(FL_REALTDM_COUNTIES.map(county => loadCounty(county))),
        loadGovEase(),
        loadBid4Assets(),
        loadSri(),
        loadRealForeclose(),
        loadProperties(),
      ])

      if (cancelled) return

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
      setRealforecloseListings(realforecloseResult.listings ?? [])
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
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const feedItems = useMemo((): LiveDataFeedItem[] => {
    return [
      ...records.map(record => ({ kind: 'realtdm' as const, record })),
      ...goveaseListings.map(listing => ({ kind: 'govease' as const, listing })),
      ...bid4assetsListings.map(listing => ({ kind: 'bid4assets' as const, listing })),
      ...sriListings.map(listing => ({ kind: 'sri' as const, listing })),
      ...realforecloseListings.map(listing => ({
        kind: 'realforeclose' as const,
        listing,
      })),
    ]
  }, [records, goveaseListings, bid4assetsListings, sriListings, realforecloseListings])

  const availableCounties = useMemo(
    () => collectFeedCounties(feedItems, filters.state),
    [feedItems, filters.state]
  )

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
  const totalDisplayed = feedItems.length

  const filtered = useMemo(
    () => filterAndSortFeedItems(feedItems, filters, q),
    [feedItems, filters, q]
  )

  const progressTotal = FL_REALTDM_COUNTY_COUNT + 4
  const progressLoaded =
    loadedCountyCount +
    (loadingGovEase ? 0 : 1) +
    (loadingBid4Assets ? 0 : 1) +
    (loadingSri ? 0 : 1) +
    (loadingRealForeclose ? 0 : 1)

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      {selected && (
        <LivePropertyModal record={selected} onClose={() => setSelected(null)} />
      )}
      <div className="mb-6">
        <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>
          FLORIDA · MICHIGAN · REALTDM + GOVEASE + BID4ASSETS + SRI + REALFORECLOSE
        </p>
        <h2 className="font-display text-3xl tracking-wide mt-1" style={{ color: 'var(--text)' }}>
          LIVE TAX DEED CASES
        </h2>
        <p className="font-mono text-xs mt-2 max-w-2xl" style={{ color: 'var(--muted)' }}>
          Upcoming resale auctions (30-day and full advertisement) from Florida RealTDM counties,
          GovEase schedule and live parcels (10 FL counties), Bid4Assets tax sales (10 MI counties),
          SRI tax deed auctions (10 MI counties), and Florida RealForeclose waiting auctions (25
          counties).
          Miami-Dade parcels merge with county GIS when
          the parcel number matches. Only
          cases with a sale date today or later are shown.
          {propertySource === 'fallback' &&
            ' (Miami-Dade ArcGIS using county backup endpoint.)'}
        </p>
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
        filters={filters}
        counties={availableCounties}
        disabled={loading}
        onChange={setFilters}
        onReset={() => setFilters(defaultLiveDataFilters)}
      />

      {loading && (
        <LiveDataLoadProgress
          loadedCount={progressLoaded}
          totalCount={progressTotal}
          loadingParcels={loadingParcels}
          loadingSourceNames={[
            ...(loadingGovEase ? ['GovEase'] : []),
            ...(loadingBid4Assets ? ['Bid4Assets'] : []),
            ...(loadingSri ? ['SRI'] : []),
            ...(loadingRealForeclose ? ['RealForeclose'] : []),
          ]}
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

      {!loading && (caseCount > 0 || totalDisplayed > 0 || !error) && (
        <>
          {error && totalDisplayed > 0 && (
            <p className="font-mono text-xs mb-3" style={{ color: '#e87a5a' }}>{error}</p>
          )}
          <p
            className="font-mono text-xs mb-3 px-3 py-2 rounded"
            style={{
              color: 'var(--muted)',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ color: 'var(--gold)' }}>{upcomingCount}</span> RealTDM upcoming
            {upcomingCount !== 1 ? '' : ''} ·{' '}
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
            <span style={{ color: 'var(--gold)' }}>{bid4assetsCount}</span> Bid4Assets listing
            {bid4assetsCount !== 1 ? 's' : ''}
            {bid4assetsCount > 0 && (
              <>
                {' '}
                ({bid4assetsSearchCount} search
                {bid4assetsCalendarCount > 0
                  ? ` · ${bid4assetsCalendarCount} calendar`
                  : ''}
                )
              </>
            )}
            {' · '}
            <span style={{ color: 'var(--gold)' }}>{sriCount}</span> SRI listing
            {sriCount !== 1 ? 's' : ''}
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
              <> ({caseCount - upcomingCount} past sale{caseCount - upcomingCount !== 1 ? 's' : ''} hidden)</>
            )}
          </p>
          <p className="font-mono text-xs mb-4" style={{ color: 'var(--muted)' }}>
            {q
              ? `${filtered.length} match${filtered.length !== 1 ? 'es' : ''} · `
              : ''}
            {filtered.length} of {totalDisplayed} displayed
            {upcomingCount > 0 && ` · BIDS/ADDRS: ${detailsEnriched} of ${upcomingCount}`}
            {propertySource != null && ` · PARCELS: ${propertySource.toUpperCase()}`}
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
              <p className="font-display text-3xl">
                {totalDisplayed === 0 ? 'NO UPCOMING SALES' : 'NO MATCHES'}
              </p>
              {totalDisplayed === 0 && caseCount > 0 && (
                <p className="font-mono text-xs mt-2">
                  All {caseCount} RealTDM cases have sale dates in the past.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(item =>
                item.kind === 'realtdm' ? (
                  <RealTdmCard
                    key={feedItemKey(item)}
                    record={item.record}
                    onSelect={() => setSelected(item.record)}
                  />
                ) : item.kind === 'govease' ? (
                  <GovEaseCard key={feedItemKey(item)} listing={item.listing} />
                ) : item.kind === 'bid4assets' ? (
                  <Bid4AssetsCard key={feedItemKey(item)} listing={item.listing} />
                ) : item.kind === 'sri' ? (
                  <SriCard key={feedItemKey(item)} listing={item.listing} />
                ) : (
                  <RealForecloseCard key={feedItemKey(item)} listing={item.listing} />
                )
              )}
            </div>
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
    </article>
  )
}

function Bid4AssetsCard({ listing }: { listing: Bid4AssetsListing }) {
  const ratio = bidToAssessedRatio(listing.openingBid, null)
  const isGoodDeal = isGoodDealRatio(ratio)
  return (
    <article
      className="rounded-md p-4 transition-all"
      style={feedCardStyle(isGoodDeal)}
      onMouseEnter={e => (e.currentTarget.style.borderColor = feedCardHoverBorder(isGoodDeal))}
      onMouseLeave={e =>
        (e.currentTarget.style.borderColor = isGoodDeal
          ? 'rgba(201,168,76,0.45)'
          : 'var(--border)')
      }
    >
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
            href={BID4ASSETS_HOME_URL}
            target="_blank"
            rel="noopener noreferrer"
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
    </article>
  )
}

function SriCard({ listing }: { listing: SriListing }) {
  const ratio = bidToAssessedRatio(listing.openingBid, null)
  const isGoodDeal = isGoodDealRatio(ratio)
  return (
    <article
      className="rounded-md p-4 transition-all"
      style={feedCardStyle(isGoodDeal)}
      onMouseEnter={e => (e.currentTarget.style.borderColor = feedCardHoverBorder(isGoodDeal))}
      onMouseLeave={e =>
        (e.currentTarget.style.borderColor = isGoodDeal
          ? 'rgba(201,168,76,0.45)'
          : 'var(--border)')
      }
    >
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
            href={SRI_HOME_URL}
            target="_blank"
            rel="noopener noreferrer"
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
    </article>
  )
}

function RealForecloseCard({ listing }: { listing: RealForecloseListing }) {
  const ratio = bidToAssessedRatio(listing.openingBid, listing.assessedValue)
  const isGoodDeal = isGoodDealRatio(ratio)
  return (
    <article
      className="rounded-md p-4 transition-all"
      style={feedCardStyle(isGoodDeal)}
      onMouseEnter={e => (e.currentTarget.style.borderColor = feedCardHoverBorder(isGoodDeal))}
      onMouseLeave={e =>
        (e.currentTarget.style.borderColor = isGoodDeal
          ? 'rgba(201,168,76,0.45)'
          : 'var(--border)')
      }
    >
      <OpeningBidHighlight openingBid={listing.openingBid} />
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="font-mono text-xs" style={{ color: '#5a9fe8' }}>
              {listing.county.toUpperCase()} · FL · REALFORECLOSE
            </p>
            {isGoodDeal && <GoodDealBadge />}
            {listing.auctionType && listing.auctionType !== '—' && (
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
    </article>
  )
}

function GovEaseCard({ listing }: { listing: GovEaseListing }) {
  const href = GOVEASE_HOME_URL
  const ratio = bidToAssessedRatio(listing.openingBid, null)
  const isGoodDeal = isGoodDealRatio(ratio)
  return (
    <article
      className="rounded-md p-4 transition-all"
      style={feedCardStyle(isGoodDeal)}
      onMouseEnter={e => (e.currentTarget.style.borderColor = feedCardHoverBorder(isGoodDeal))}
      onMouseLeave={e =>
        (e.currentTarget.style.borderColor = isGoodDeal
          ? 'rgba(201,168,76,0.45)'
          : 'var(--border)')
      }
    >
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
    </article>
  )
}
