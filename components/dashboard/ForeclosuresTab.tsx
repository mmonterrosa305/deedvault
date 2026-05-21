'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ForeclosureListing } from '@/lib/foreclosure-listing'
import {
  collectForeclosureCounties,
  defaultForeclosureFilters,
  filterAndSortForeclosureListings,
  type ForeclosureFilterState,
} from '@/lib/foreclosure-feed'
import ForeclosureListingCard from '@/components/dashboard/ForeclosureListingCard'
import LiveDataFilters from '@/components/dashboard/LiveDataFilters'
import LiveDataLoadProgress from '@/components/dashboard/LiveDataLoadProgress'

type ForeclosureSubTab = 'auctions' | 'pre-foreclosures' | 'lis-pendens'

type AuctionsResponse = {
  listings: ForeclosureListing[]
  countyCounts?: { county: string; count: number }[]
  error?: string
}

type ListingsResponse = {
  listings: ForeclosureListing[]
  warning?: string
  error?: string
}

const SUB_TABS: { id: ForeclosureSubTab; label: string }[] = [
  { id: 'auctions', label: 'Auctions' },
  { id: 'pre-foreclosures', label: 'Pre-Foreclosures' },
  { id: 'lis-pendens', label: 'LIS PENDENS' },
]

export default function ForeclosuresTab() {
  const [subTab, setSubTab] = useState<ForeclosureSubTab>('auctions')
  const [auctionListings, setAuctionListings] = useState<ForeclosureListing[]>([])
  const [preListings, setPreListings] = useState<ForeclosureListing[]>([])
  const [lisListings, setLisListings] = useState<ForeclosureListing[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAuctions, setLoadingAuctions] = useState(false)
  const [loadingPre, setLoadingPre] = useState(false)
  const [loadingLis, setLoadingLis] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<ForeclosureFilterState>(defaultForeclosureFilters)

  useEffect(() => {
    let cancelled = false

    async function loadAuctions() {
      setLoadingAuctions(true)
      try {
        const res = await fetch('/api/foreclosures/auctions', { cache: 'no-store' })
        const data = (await res.json()) as AuctionsResponse
        if (!cancelled) {
          if (!res.ok) throw new Error(data.error ?? 'Auctions failed')
          setAuctionListings(data.listings ?? [])
        }
        return data
      } catch (err) {
        if (!cancelled) setAuctionListings([])
        return {
          error: err instanceof Error ? err.message : 'Auctions failed',
          listings: [],
        }
      } finally {
        if (!cancelled) setLoadingAuctions(false)
      }
    }

    async function loadLis() {
      setLoadingLis(true)
      try {
        const res = await fetch('/api/foreclosures/lis-pendens', { cache: 'no-store' })
        const data = (await res.json()) as ListingsResponse
        if (!cancelled) {
          if (!res.ok) throw new Error(data.error ?? 'LIS PENDENS failed')
          setLisListings(data.listings ?? [])
          if (data.warning) setWarnings(w => [...w, data.warning!])
        }
      } catch (err) {
        if (!cancelled) setLisListings([])
        if (!cancelled) {
          setWarnings(w => [
            ...w,
            err instanceof Error ? err.message : 'LIS PENDENS failed',
          ])
        }
      } finally {
        if (!cancelled) setLoadingLis(false)
      }
    }

    async function loadPre() {
      setLoadingPre(true)
      try {
        const res = await fetch('/api/foreclosures/pre-foreclosures', { cache: 'no-store' })
        const data = (await res.json()) as ListingsResponse
        if (!cancelled) {
          if (!res.ok) throw new Error(data.error ?? 'Pre-foreclosures failed')
          setPreListings(data.listings ?? [])
          if (data.warning) setWarnings(w => [...w, data.warning!])
        }
      } catch (err) {
        if (!cancelled) setPreListings([])
        if (!cancelled) {
          setWarnings(w => [
            ...w,
            err instanceof Error ? err.message : 'Pre-foreclosures failed',
          ])
        }
      } finally {
        if (!cancelled) setLoadingPre(false)
      }
    }

    async function load() {
      setLoading(true)
      setError(null)
      setWarnings([])

      const [auctionResult] = await Promise.all([
        loadAuctions(),
        loadLis(),
        loadPre(),
      ])

      if (!cancelled) {
        const errs: string[] = []
        if (auctionResult.error) errs.push(auctionResult.error)
        if (errs.length === 3) {
          setError(errs.join(' · '))
        } else if (errs.length > 0) {
          setWarnings(w => [...w, ...errs])
        }
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const activeListings = useMemo(() => {
    if (subTab === 'auctions') return auctionListings
    if (subTab === 'pre-foreclosures') return preListings
    return lisListings
  }, [subTab, auctionListings, preListings, lisListings])

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
  const anySourceLoading = loadingAuctions || loadingPre || loadingLis
  const progressLoaded =
    (loadingAuctions ? 0 : 1) + (loadingPre ? 0 : 1) + (loadingLis ? 0 : 1)
  const progressTotal = 3

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>
          FLORIDA · REALFORECLOSE + MIAMI-DADE CLERK
        </p>
        <h2 className="font-display text-3xl tracking-wide mt-1" style={{ color: 'var(--text)' }}>
          FORECLOSURES
        </h2>
        <p className="font-mono text-xs mt-2 max-w-2xl" style={{ color: 'var(--muted)' }}>
          Foreclosure auctions from RealForeclose (25 FL counties), pre-foreclosure filings from
          Miami-Dade Clerk Official Records, and LIS PENDENS recorded at{' '}
          <a
            href="https://www.miami-dadeclerk.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--gold)' }}
          >
            miami-dadeclerk.com
          </a>
          .
        </p>
      </div>

      <div
        className="flex gap-1 mb-4 border-b overflow-x-auto"
        style={{ borderColor: 'var(--border)' }}
      >
        {SUB_TABS.map(tab => {
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
              {count > 0 && (
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
        onReset={() => setFilters(defaultForeclosureFilters)}
      />

      {loading && (
        <LiveDataLoadProgress
          loadedCount={progressLoaded}
          totalCount={progressTotal}
          loadingParcels={anySourceLoading}
          loadingSourceNames={[
            ...(loadingAuctions ? ['RealForeclose Auctions'] : []),
            ...(loadingPre ? ['Pre-Foreclosures'] : []),
            ...(loadingLis ? ['LIS PENDENS'] : []),
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

      {!loading && (
        <>
          {warnings.length > 0 && (
            <p className="font-mono text-xs mb-3" style={{ color: '#e87a5a' }}>
              {[...new Set(warnings)].join(' · ')}
            </p>
          )}
          <p className="font-mono text-xs mb-4" style={{ color: 'var(--muted)' }}>
            {q ? `${filtered.length} match${filtered.length !== 1 ? 'es' : ''} · ` : ''}
            {filtered.length} of {totalDisplayed} displayed
            {' · '}
            <span style={{ color: 'var(--gold)' }}>{auctionListings.length}</span> auctions
            {' · '}
            <span style={{ color: 'var(--gold)' }}>{preListings.length}</span> pre-foreclosure
            {' · '}
            <span style={{ color: 'var(--gold)' }}>{lisListings.length}</span> LIS PENDENS
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
              <p className="font-display text-3xl">
                {totalDisplayed === 0 ? 'NO LISTINGS' : 'NO MATCHES'}
              </p>
              {subTab === 'lis-pendens' && totalDisplayed === 0 && (
                <p className="font-mono text-xs mt-2 max-w-md mx-auto">
                  Clerk search may require MIAMI_DADE_CLERK_RECAPTCHA_TOKEN or a saved search QS in
                  .env.local — see .env.local.example.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(listing => (
                <ForeclosureListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
