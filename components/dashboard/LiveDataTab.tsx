'use client'

import { useEffect, useMemo, useState } from 'react'
import type { MiamiDadeProperty } from '@/lib/miami-dade-api'
import { REALFORECLOSE_URL } from '@/lib/miami-dade-api'
import {
  caseUniqueId,
  countyBaseUrl,
  FL_REALTDM_COUNTIES,
  FL_REALTDM_COUNTY_COUNT,
  type RealTdmCase,
} from '@/lib/realtdm'
import { fmt } from '@/lib/listings'
import { mergeLiveData, type LiveDataRecord } from '@/lib/live-data-merge'
import LivePropertyModal from '@/components/listing/LivePropertyModal'
import LiveDataLoadProgress from '@/components/dashboard/LiveDataLoadProgress'

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

export default function LiveDataTab() {
  const [records, setRecords] = useState<LiveDataRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [propertySource, setPropertySource] = useState<'primary' | 'fallback' | null>(null)
  const [caseCount, setCaseCount] = useState(0)
  const [detailsEnriched, setDetailsEnriched] = useState(0)
  const [loadedCountyCount, setLoadedCountyCount] = useState(0)
  const [loadingCountyNames, setLoadingCountyNames] = useState<string[]>([])
  const [loadingParcels, setLoadingParcels] = useState(false)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<LiveDataRecord | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCounty(county: (typeof FL_REALTDM_COUNTIES)[number]) {
      if (cancelled) return { cases: [] as RealTdmCase[], listed: 0, enriched: 0, err: true }

      setLoadingCountyNames(prev =>
        prev.includes(county.name) ? prev : [...prev, county.name]
      )

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
          setLoadingCountyNames(prev => prev.filter(n => n !== county.name))
          setLoadedCountyCount(prev => prev + 1)
        }
      }
    }

    async function load() {
      setLoading(true)
      setError(null)
      setLoadedCountyCount(0)
      setLoadingCountyNames([])
      setLoadingParcels(false)
      setRecords([])
      setCaseCount(0)
      setDetailsEnriched(0)

      const propsPromise = fetch('/api/miami-dade/properties')

      const countyResults = await Promise.all(
        FL_REALTDM_COUNTIES.map(county => loadCounty(county))
      )

      if (cancelled) return

      setLoadingParcels(true)
      let properties: MiamiDadeProperty[] = []
      let propsOk = false
      let propsErr: string | undefined

      try {
        const propsRes = await propsPromise
        const propsData = (await propsRes.json()) as PropertiesResponse
        propsOk = propsRes.ok
        properties = propsOk ? (propsData.properties ?? []) : []
        propsErr = propsData.error
        if (propsOk) setPropertySource(propsData.source ?? null)
      } catch {
        propsErr = 'Failed to load parcel data'
      }

      if (cancelled) return

      const allCases = countyResults.flatMap(r => r.cases)
      const totalListed = countyResults.reduce((n, r) => n + r.listed, 0)
      const enriched = countyResults.reduce((n, r) => n + r.enriched, 0)
      const failedCounties = countyResults.filter(r => r.err).length

      setRecords(mergeLiveData(allCases, properties))
      setCaseCount(totalListed)
      setDetailsEnriched(enriched)

      const warnings: string[] = []
      if (failedCounties > 0) {
        warnings.push(`${failedCounties} county source${failedCounties !== 1 ? 's' : ''} unavailable`)
      }
      if (!propsOk) {
        warnings.push(`Property data unavailable: ${propsErr}`)
      }
      if (allCases.length === 0 && failedCounties === FL_REALTDM_COUNTY_COUNT) {
        setError('Failed to load tax deed cases from all counties')
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

  const upcomingCount = records.length

  const filtered = useMemo(() => {
    if (!q) return records
    const lq = q.toLowerCase()
    return records.filter(r => {
      const c = r.case
      return (
        c.caseNumber.toLowerCase().includes(lq) ||
        c.county.toLowerCase().includes(lq) ||
        c.parcelNumber.toLowerCase().includes(lq) ||
        c.status.toLowerCase().includes(lq) ||
        r.displayAddress.toLowerCase().includes(lq) ||
        (r.displayOwner?.toLowerCase().includes(lq) ?? false)
      )
    })
  }, [records, q])

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      {selected && (
        <LivePropertyModal record={selected} onClose={() => setSelected(null)} />
      )}
      <div className="mb-6">
        <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>
          FLORIDA · 17 REALTDM COUNTIES
        </p>
        <h2 className="font-display text-3xl tracking-wide mt-1" style={{ color: 'var(--text)' }}>
          LIVE TAX DEED CASES
        </h2>
        <p className="font-mono text-xs mt-2 max-w-2xl" style={{ color: 'var(--muted)' }}>
          Upcoming resale auctions (30-day and full advertisement) from all Florida RealTDM
          counties, fetched in parallel. Miami-Dade parcels are merged with county GIS when the
          parcel number matches. Only cases with a sale date today or in the future are shown.
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

      {loading && (
        <LiveDataLoadProgress
          loadedCount={loadedCountyCount}
          totalCount={FL_REALTDM_COUNTY_COUNT}
          loadingCountyNames={loadingCountyNames}
          loadingParcels={loadingParcels}
        />
      )}

      {error && !loading && records.length === 0 && (
        <div
          className="rounded-md px-4 py-8 text-center"
          style={{ background: 'var(--panel)', border: '1px solid rgba(232,122,90,0.3)' }}
        >
          <p className="font-mono text-xs" style={{ color: '#e87a5a' }}>{error}</p>
        </div>
      )}

      {!loading && (caseCount > 0 || upcomingCount > 0 || !error) && (
        <>
          {error && (caseCount > 0 || upcomingCount > 0) && (
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
            <span style={{ color: 'var(--gold)' }}>{upcomingCount}</span> upcoming sale
            {upcomingCount !== 1 ? 's' : ''} shown ·{' '}
            <span style={{ color: 'var(--text)' }}>{caseCount}</span> total cases found on RealTDM
            {caseCount > upcomingCount && (
              <> ({caseCount - upcomingCount} past sale{caseCount - upcomingCount !== 1 ? 's' : ''} hidden)</>
            )}
          </p>
          <p className="font-mono text-xs mb-4" style={{ color: 'var(--muted)' }}>
            {q
              ? `${filtered.length} match${filtered.length !== 1 ? 'es' : ''} · `
              : ''}
            {filtered.length} DISPLAYED
            {upcomingCount > 0 && ` · BIDS/ADDRS: ${detailsEnriched} of ${upcomingCount}`}
            {propertySource != null && ` · PARCELS: ${propertySource.toUpperCase()}`}
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
              <p className="font-display text-3xl">
                {upcomingCount === 0 ? 'NO UPCOMING SALES' : 'NO MATCHES'}
              </p>
              {upcomingCount === 0 && caseCount > 0 && (
                <p className="font-mono text-xs mt-2">
                  All {caseCount} cases have sale dates in the past.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(r => (
                <article
                  key={caseUniqueId(r.case)}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(r)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelected(r)
                    }
                  }}
                  className="rounded-md p-4 transition-all cursor-pointer"
                  style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-mono text-xs" style={{ color: '#5a9fe8' }}>
                          {r.case.county.toUpperCase()} · FL
                        </p>
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
                      <div className="text-right">
                        <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                          OPENING BID
                        </p>
                        <p className="font-display text-2xl tracking-wide" style={{ color: 'var(--gold)' }}>
                          {r.case.openingBid != null ? fmt(r.case.openingBid) : '—'}
                        </p>
                      </div>
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
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
