'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ForeclosureListing } from '@/lib/foreclosure-listing'
import {
  collectForeclosureCounties,
  defaultForeclosureFilters,
  filterAndSortForeclosureListings,
  filterForeclosureTabListings,
  type ForeclosureFilterState,
} from '@/lib/foreclosure-feed'
import type { MichiganSourceCounts } from '@/lib/michigan-foreclosures'
import ForeclosureListingCard from '@/components/dashboard/ForeclosureListingCard'
import ForeclosurePropertyModal from '@/components/listing/ForeclosurePropertyModal'
import MichiganCountyDirectory from '@/components/dashboard/MichiganCountyDirectory'
import LiveDataFilters from '@/components/dashboard/LiveDataFilters'
import LiveDataLoadProgress from '@/components/dashboard/LiveDataLoadProgress'
import DataFreshnessBar from '@/components/dashboard/DataFreshnessBar'
import { withRefreshParam } from '@/lib/cached-api'

type ForeclosureRegion = 'florida' | 'michigan'
type ForeclosureSubTab = 'auctions' | 'pre-foreclosures' | 'lis-pendens'
type MichiganSubTab = 'auctions' | 'counties'

type CacheFields = { cachedAt?: number; fromCache?: boolean }

type AuctionsResponse = CacheFields & {
  listings: ForeclosureListing[]
  countyCounts?: { county: string; count: number }[]
  error?: string
}

type ListingsResponse = {
  listings: ForeclosureListing[]
  warning?: string
  error?: string
}

type MichiganResponse = CacheFields & {
  listings: ForeclosureListing[]
  sourceCounts: MichiganSourceCounts
  warnings: string[]
  wayneCatalogTotal: number
  taxSaleAuctionGroups: string[]
  error?: string
}

const REGION_TABS: { id: ForeclosureRegion; label: string }[] = [
  { id: 'florida', label: 'Florida' },
  { id: 'michigan', label: 'Michigan' },
]

const FL_SUB_TABS: { id: ForeclosureSubTab; label: string }[] = [
  { id: 'auctions', label: 'Auctions' },
  { id: 'pre-foreclosures', label: 'Pre-Foreclosures' },
  { id: 'lis-pendens', label: 'LIS PENDENS' },
]

const MI_SUB_TABS: { id: MichiganSubTab; label: string }[] = [
  { id: 'auctions', label: 'Tax Deed Auctions' },
  { id: 'counties', label: 'County Sources' },
]

const MICHIGAN_FORECLOSURES_API = '/api/michigan-foreclosures'

function parseRegionParam(value: string | null): ForeclosureRegion | null {
  if (value === 'florida' || value === 'michigan') return value
  return null
}

function parseMiTabParam(value: string | null): MichiganSubTab | null {
  if (value === 'auctions' || value === 'counties') return value
  return null
}

function ForeclosuresTabContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [region, setRegion] = useState<ForeclosureRegion>('florida')
  const [subTab, setSubTab] = useState<ForeclosureSubTab>('auctions')
  const [miSubTab, setMiSubTab] = useState<MichiganSubTab>('auctions')

  const [auctionListings, setAuctionListings] = useState<ForeclosureListing[]>([])
  const [preListings, setPreListings] = useState<ForeclosureListing[]>([])
  const [lisListings, setLisListings] = useState<ForeclosureListing[]>([])
  const [miListings, setMiListings] = useState<ForeclosureListing[]>([])
  const [miSourceCounts, setMiSourceCounts] = useState<MichiganSourceCounts | null>(null)
  const [miWarnings, setMiWarnings] = useState<string[]>([])

  const [flLoaded, setFlLoaded] = useState(false)
  const [miLoaded, setMiLoaded] = useState(false)
  const [loadingFl, setLoadingFl] = useState(true)
  const [loadingMi, setLoadingMi] = useState(false)
  const [loadingAuctions, setLoadingAuctions] = useState(false)
  const [loadingPre, setLoadingPre] = useState(false)
  const [loadingLis, setLoadingLis] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<ForeclosureFilterState>(defaultForeclosureFilters)
  const [selectedListing, setSelectedListing] = useState<ForeclosureListing | null>(null)
  const [flLastUpdatedAt, setFlLastUpdatedAt] = useState<number | null>(null)
  const [miLastUpdatedAt, setMiLastUpdatedAt] = useState<number | null>(null)
  const miFetchGen = useRef(0)

  const syncForeclosuresUrl = useCallback(
    (patch: { region?: ForeclosureRegion; miTab?: MichiganSubTab }) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', 'foreclosures')
      if (patch.region) params.set('region', patch.region)
      if (patch.miTab) params.set('miTab', patch.miTab)
      router.replace(`/dashboard?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  useEffect(() => {
    const urlRegion = parseRegionParam(searchParams.get('region'))
    const urlMiTab = parseMiTabParam(searchParams.get('miTab'))
    if (urlRegion) setRegion(urlRegion)
    if (urlMiTab) setMiSubTab(urlMiTab)
  }, [searchParams])

  const selectRegion = useCallback(
    (next: ForeclosureRegion) => {
      setRegion(next)
      syncForeclosuresUrl({
        region: next,
        miTab: next === 'michigan' ? miSubTab : undefined,
      })
    },
    [miSubTab, syncForeclosuresUrl]
  )

  const selectMiSubTab = useCallback(
    (next: MichiganSubTab) => {
      setMiSubTab(next)
      syncForeclosuresUrl({ region: 'michigan', miTab: next })
    },
    [syncForeclosuresUrl]
  )

  const loadFlorida = useCallback(async (refresh = false) => {
    setLoadingFl(true)
    setError(null)
    setWarnings([])

    async function loadAuctions() {
      setLoadingAuctions(true)
      try {
        const res = await fetch(withRefreshParam('/api/foreclosures/auctions', refresh))
        const data = (await res.json()) as AuctionsResponse
        if (!res.ok) throw new Error(data.error ?? 'Auctions failed')
        setAuctionListings(data.listings ?? [])
        return data
      } catch (err) {
        setAuctionListings([])
        return {
          error: err instanceof Error ? err.message : 'Auctions failed',
          listings: [],
        }
      } finally {
        setLoadingAuctions(false)
      }
    }

    async function loadLis() {
      setLoadingLis(true)
      try {
        const res = await fetch('/api/foreclosures/lis-pendens', { cache: 'no-store' })
        const data = (await res.json()) as ListingsResponse
        if (!res.ok) throw new Error(data.error ?? 'LIS PENDENS failed')
        setLisListings(data.listings ?? [])
        if (data.warning) setWarnings(w => [...w, data.warning!])
      } catch (err) {
        setLisListings([])
        setWarnings(w => [
          ...w,
          err instanceof Error ? err.message : 'LIS PENDENS failed',
        ])
      } finally {
        setLoadingLis(false)
      }
    }

    async function loadPre() {
      setLoadingPre(true)
      try {
        const res = await fetch('/api/foreclosures/pre-foreclosures', { cache: 'no-store' })
        const data = (await res.json()) as ListingsResponse
        if (!res.ok) throw new Error(data.error ?? 'Pre-foreclosures failed')
        setPreListings(data.listings ?? [])
        if (data.warning) setWarnings(w => [...w, data.warning!])
      } catch (err) {
        setPreListings([])
        setWarnings(w => [
          ...w,
          err instanceof Error ? err.message : 'Pre-foreclosures failed',
        ])
      } finally {
        setLoadingPre(false)
      }
    }

    const [auctionResult] = await Promise.all([loadAuctions(), loadLis(), loadPre()])
    const errs: string[] = []
    if (auctionResult.error) errs.push(auctionResult.error)
    if (errs.length > 0) setWarnings(w => [...w, ...errs])
    setFlLastUpdatedAt(auctionResult.cachedAt ?? Date.now())
    setFlLoaded(true)
    setLoadingFl(false)
  }, [])

  useEffect(() => {
    if (!flLoaded) loadFlorida(false)
  }, [flLoaded, loadFlorida])

  const loadMichigan = useCallback(async (refresh = false) => {
    const gen = ++miFetchGen.current
    setLoadingMi(true)
    setMiWarnings([])
    try {
      const res = await fetch(withRefreshParam(MICHIGAN_FORECLOSURES_API, refresh))
      if (!res.ok) {
        const body = await res.text()
        let message = `Michigan foreclosures API returned ${res.status}`
        try {
          const parsed = JSON.parse(body) as { error?: string }
          if (parsed.error) message = parsed.error
        } catch {
          if (res.status === 404) {
            message =
              'Michigan foreclosures API not found. Restart the dev server after pulling latest changes.'
          }
        }
        throw new Error(message)
      }
      const data = (await res.json()) as MichiganResponse
      if (gen !== miFetchGen.current) return
      setMiListings(data.listings ?? [])
      setMiSourceCounts(data.sourceCounts ?? null)
      setMiWarnings(data.warnings ?? [])
      setMiLastUpdatedAt(data.cachedAt ?? Date.now())
      setMiLoaded(true)
    } catch (err) {
      if (gen !== miFetchGen.current) return
      setMiListings([])
      setMiSourceCounts(null)
      setMiWarnings([
        err instanceof Error ? err.message : 'Michigan foreclosures fetch failed',
      ])
      setMiLoaded(false)
    } finally {
      if (gen === miFetchGen.current) setLoadingMi(false)
    }
  }, [])

  useEffect(() => {
    if (region === 'michigan' && !miLoaded && !loadingMi) {
      loadMichigan(false)
    }
  }, [region, miLoaded, loadingMi, loadMichigan])

  const freshnessLastUpdated =
    region === 'michigan' ? miLastUpdatedAt : flLastUpdatedAt

  const handleRefresh = useCallback(() => {
    if (region === 'michigan') {
      loadMichigan(true)
    } else {
      loadFlorida(true)
    }
  }, [region, loadMichigan, loadFlorida])

  useEffect(() => {
    if (region === 'michigan') {
      setFilters(f => ({ ...f, state: 'MI' }))
    } else {
      setFilters(f => ({ ...f, state: 'FL' }))
    }
    setSelectedListing(null)
  }, [region])

  useEffect(() => {
    if (miSubTab !== 'auctions') setSelectedListing(null)
  }, [miSubTab])

  const activeListings = useMemo(() => {
    let list: ForeclosureListing[]
    if (region === 'michigan') list = miListings
    else if (subTab === 'auctions') list = auctionListings
    else if (subTab === 'pre-foreclosures') list = preListings
    else list = lisListings
    return filterForeclosureTabListings(list)
  }, [region, subTab, auctionListings, preListings, lisListings, miListings])

  const availableCounties = useMemo(
    () => collectForeclosureCounties(activeListings),
    [activeListings]
  )

  useEffect(() => {
    if (filters.county && !availableCounties.includes(filters.county)) {
      setFilters(f => ({ ...f, county: '' }))
    }
  }, [availableCounties, filters.county])

  const filtered = useMemo(
    () => filterAndSortForeclosureListings(activeListings, filters, q),
    [activeListings, filters, q]
  )

  const totalDisplayed = activeListings.length
  const showListings =
    region === 'florida' || (region === 'michigan' && miSubTab === 'auctions')
  const showMiDirectory = region === 'michigan' && miSubTab === 'counties'

  const loading =
    region === 'florida' ? loadingFl : loadingMi && !miLoaded
  const anySourceLoading =
    region === 'florida'
      ? loadingAuctions || loadingPre || loadingLis
      : loadingMi
  const progressTotal = region === 'florida' ? 3 : 4
  const progressLoaded =
    region === 'florida'
      ? (loadingAuctions ? 0 : 1) + (loadingPre ? 0 : 1) + (loadingLis ? 0 : 1)
      : loadingMi
        ? 0
        : 4

  const allWarnings = [...warnings, ...(region === 'michigan' ? miWarnings : [])]

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>
          {region === 'florida'
            ? 'FLORIDA · REALFORECLOSE + MIAMI-DADE CLERK'
            : 'MICHIGAN · TAX DEED + CIRCUIT COURT FORECLOSURES'}
        </p>
        <h2 className="font-display text-3xl tracking-wide mt-1" style={{ color: 'var(--text)' }}>
          FORECLOSURES
        </h2>
        <p className="font-mono text-xs mt-2 max-w-2xl" style={{ color: 'var(--muted)' }}>
          {region === 'florida' ? (
            <>
              Foreclosure auctions from RealForeclose (25 FL counties), pre-foreclosure filings
              from Miami-Dade Clerk Official Records, and LIS PENDENS at{' '}
              <a
                href="https://www.miami-dadeclerk.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--gold)' }}
              >
                miami-dadeclerk.com
              </a>
              .
            </>
          ) : (
            <>
              Michigan tax forfeiture auctions from Wayne County, tax-sale.info (Title Check),
              Bid4Assets, and SRI — plus county treasurer and circuit court links for all 20
              target counties.
            </>
          )}
        </p>
      </div>

      <DataFreshnessBar
        lastUpdatedAt={freshnessLastUpdated}
        loading={region === 'michigan' ? loadingMi : loadingFl}
        onRefresh={handleRefresh}
      />

      <div
        className="flex gap-1 mb-4 border-b overflow-x-auto"
        style={{ borderColor: 'var(--border)' }}
      >
        {REGION_TABS.map(tab => {
          const active = region === tab.id
          const count =
            tab.id === 'florida'
              ? auctionListings.length + preListings.length + lisListings.length
              : filterForeclosureTabListings(miListings).length
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
              {flLoaded && tab.id === 'florida' && count > 0 && (
                <span className="ml-2 opacity-80">({count})</span>
              )}
              {miLoaded && tab.id === 'michigan' && (
                <span className="ml-2 opacity-80">
                  ({filterForeclosureTabListings(miListings).length})
                </span>
              )}
            </button>
          )
        })}
      </div>

      {region === 'florida' && (
        <div
          className="flex gap-1 mb-4 border-b overflow-x-auto"
          style={{ borderColor: 'var(--border)' }}
        >
          {FL_SUB_TABS.map(tab => {
            const active = subTab === tab.id
            const count =
              tab.id === 'auctions'
                ? auctionListings.length
                : tab.id === 'pre-foreclosures'
                  ? preListings.length
                  : lisListings.length
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className="font-mono text-xs tracking-widest px-4 py-2 transition-all whitespace-nowrap"
                style={{
                  color: active ? 'var(--gold)' : 'var(--muted)',
                  borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                {tab.label.toUpperCase()}
                {count > 0 && <span className="ml-2 opacity-80">({count})</span>}
              </button>
            )
          })}
        </div>
      )}

      {region === 'michigan' && (
        <div
          className="flex gap-1 mb-4 border-b overflow-x-auto"
          style={{ borderColor: 'var(--border)' }}
        >
          {MI_SUB_TABS.map(tab => {
            const active = miSubTab === tab.id
            const count =
              tab.id === 'auctions' ? filterForeclosureTabListings(miListings).length : 20
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectMiSubTab(tab.id)}
                className="font-mono text-xs tracking-widest px-4 py-2 transition-all whitespace-nowrap"
                style={{
                  color: active ? 'var(--gold)' : 'var(--muted)',
                  borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                {tab.label.toUpperCase()}
                <span className="ml-2 opacity-80">({count})</span>
              </button>
            )
          })}
        </div>
      )}

      {showListings && (
        <>
          <div
            className={`flex gap-2 mb-6${loading ? ' opacity-50 pointer-events-none' : ''}`}
            aria-disabled={loading}
          >
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Filter by county, case #, parcel, address..."
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
            onReset={() =>
              setFilters({
                ...defaultForeclosureFilters,
                state: region === 'michigan' ? 'MI' : 'FL',
              })
            }
          />
        </>
      )}

      {loading && (showListings || showMiDirectory) && (
        <LiveDataLoadProgress
          loadedCount={progressLoaded}
          totalCount={progressTotal}
          loadingParcels={anySourceLoading}
          loadingSourceNames={
            region === 'florida'
              ? [
                  ...(loadingAuctions ? ['RealForeclose Auctions'] : []),
                  ...(loadingPre ? ['Pre-Foreclosures'] : []),
                  ...(loadingLis ? ['LIS PENDENS'] : []),
                ]
              : [
                  ...(loadingMi ? ['Bid4Assets'] : []),
                  ...(loadingMi ? ['SRI'] : []),
                  ...(loadingMi ? ['Wayne County'] : []),
                  ...(loadingMi ? ['tax-sale.info'] : []),
                ]
          }
        />
      )}

      {error && !loading && showListings && totalDisplayed === 0 && (
        <div
          className="rounded-md px-4 py-8 text-center"
          style={{ background: 'var(--panel)', border: '1px solid rgba(232,122,90,0.3)' }}
        >
          <p className="font-mono text-xs" style={{ color: '#e87a5a' }}>
            {error}
          </p>
        </div>
      )}

      {!loading && showListings && (
        <>
          {allWarnings.length > 0 && (
            <p className="font-mono text-xs mb-3" style={{ color: '#e87a5a' }}>
              {[...new Set(allWarnings)].join(' · ')}
            </p>
          )}
          {region === 'michigan' && miSourceCounts && (
            <p className="font-mono text-xs mb-4" style={{ color: 'var(--muted)' }}>
              Sources:{' '}
              <span style={{ color: 'var(--gold)' }}>{miSourceCounts.bid4assets}</span> Bid4Assets
              {' · '}
              <span style={{ color: 'var(--gold)' }}>{miSourceCounts.sri}</span> SRI
              {' · '}
              <span style={{ color: 'var(--gold)' }}>{miSourceCounts.wayne}</span> Wayne
              {' · '}
              <span style={{ color: 'var(--gold)' }}>{miSourceCounts.taxSaleInfo}</span>{' '}
              tax-sale.info
            </p>
          )}
          <p className="font-mono text-xs mb-4" style={{ color: 'var(--muted)' }}>
            {q ? `${filtered.length} match${filtered.length !== 1 ? 'es' : ''} · ` : ''}
            {filtered.length} of {totalDisplayed} displayed
            {region === 'florida' && (
              <>
                {' · '}
                <span style={{ color: 'var(--gold)' }}>{auctionListings.length}</span> auctions
                {' · '}
                <span style={{ color: 'var(--gold)' }}>{preListings.length}</span> pre-foreclosure
                {' · '}
                <span style={{ color: 'var(--gold)' }}>{lisListings.length}</span> LIS PENDENS
              </>
            )}
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
              <p className="font-display text-3xl">
                {totalDisplayed === 0 ? 'NO LISTINGS' : 'NO MATCHES'}
              </p>
              {region === 'florida' && subTab === 'lis-pendens' && totalDisplayed === 0 && (
                <p className="font-mono text-xs mt-2 max-w-md mx-auto">
                  Clerk search may require MIAMI_DADE_CLERK_RECAPTCHA_TOKEN or a saved search QS in
                  .env.local — see .env.local.example.
                </p>
              )}
              {region === 'michigan' && totalDisplayed === 0 && (
                <p className="font-mono text-xs mt-2 max-w-md mx-auto">
                  Michigan tax deed and forfeiture auctions are on the Tax Deeds tab. Open County
                  Sources here for treasurer and circuit court links.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(listing => (
                <ForeclosureListingCard
                  key={listing.id}
                  listing={listing}
                  onSelect={
                    region === 'michigan'
                      ? () => setSelectedListing(listing)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {selectedListing && region === 'michigan' && (
        <ForeclosurePropertyModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}

      {showMiDirectory && <MichiganCountyDirectory />}
    </div>
  )
}

function ForeclosuresTabFallback() {
  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      <p className="font-mono text-xs text-center py-16" style={{ color: 'var(--muted)' }}>
        Loading foreclosures…
      </p>
    </div>
  )
}

export default function ForeclosuresTab() {
  return (
    <Suspense fallback={<ForeclosuresTabFallback />}>
      <ForeclosuresTabContent />
    </Suspense>
  )
}
