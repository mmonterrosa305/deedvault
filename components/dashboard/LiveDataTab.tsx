'use client'

import { useEffect, useMemo, useState } from 'react'
import type { MiamiDadeProperty } from '@/lib/miami-dade-api'
import { REALFORECLOSE_URL } from '@/lib/miami-dade-api'
import type { MiamiDadeCase } from '@/lib/miami-dade-realtdm'
import { fmt } from '@/lib/listings'
import { mergeLiveData, type LiveDataRecord } from '@/lib/live-data-merge'
import LivePropertyModal from '@/components/listing/LivePropertyModal'

type PropertiesResponse = {
  properties: MiamiDadeProperty[]
  source?: 'primary' | 'fallback'
  error?: string
}

type CasesResponse = {
  cases: MiamiDadeCase[]
  count?: number
  error?: string
}

export default function LiveDataTab() {
  const [records, setRecords] = useState<LiveDataRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [propertySource, setPropertySource] = useState<'primary' | 'fallback' | null>(null)
  const [caseCount, setCaseCount] = useState(0)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<LiveDataRecord | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [propsRes, casesRes] = await Promise.all([
          fetch('/api/miami-dade/properties'),
          fetch('/api/miami-dade/cases'),
        ])

        const propsData = (await propsRes.json()) as PropertiesResponse
        const casesData = (await casesRes.json()) as CasesResponse

        if (!propsRes.ok && !casesRes.ok) {
          throw new Error(
            casesData.error ?? propsData.error ?? 'Failed to load live data'
          )
        }

        const properties = propsRes.ok ? (propsData.properties ?? []) : []
        const cases = casesRes.ok ? (casesData.cases ?? []) : []

        if (!casesRes.ok && cases.length === 0) {
          throw new Error(casesData.error ?? 'Failed to load tax deed cases')
        }

        if (!cancelled) {
          setRecords(mergeLiveData(cases, properties))
          setPropertySource(propsRes.ok ? (propsData.source ?? null) : null)
          setCaseCount(cases.length)
          if (!casesRes.ok) {
            setError(`Cases unavailable: ${casesData.error}`)
          } else if (!propsRes.ok) {
            setError(`Property data unavailable: ${propsData.error}`)
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load live data')
          setRecords([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!q) return records
    const lq = q.toLowerCase()
    return records.filter(r => {
      const c = r.case
      return (
        c.caseNumber.toLowerCase().includes(lq) ||
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
          MIAMI-DADE COUNTY · REALTDM + ARCGIS
        </p>
        <h2 className="font-display text-3xl tracking-wide mt-1" style={{ color: 'var(--text)' }}>
          LIVE TAX DEED CASES
        </h2>
        <p className="font-mono text-xs mt-2 max-w-2xl" style={{ color: 'var(--muted)' }}>
          Active resale cases from RealTDM (30-day and full advertisement), merged with county parcel
          records when the parcel number matches.
          {propertySource === 'fallback' &&
            ' (ArcGIS using county backup endpoint.)'}
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Filter by case #, parcel, address, or owner..."
          className="flex-1"
          style={{ height: '42px', fontSize: '14px' }}
        />
        <button
          type="button"
          onClick={() => setQ('')}
          className="font-mono text-xs px-4 rounded"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
            cursor: 'pointer',
            height: '42px',
          }}
        >
          CLEAR
        </button>
      </div>

      {loading && (
        <div className="text-center py-20">
          <p className="font-mono text-xs animate-pulse" style={{ color: 'var(--gold)' }}>
            LOADING REALTDM CASES & PARCEL DATA...
          </p>
        </div>
      )}

      {error && !loading && records.length === 0 && (
        <div
          className="rounded-md px-4 py-8 text-center"
          style={{ background: 'var(--panel)', border: '1px solid rgba(232,122,90,0.3)' }}
        >
          <p className="font-mono text-xs" style={{ color: '#e87a5a' }}>{error}</p>
        </div>
      )}

      {!loading && (records.length > 0 || !error) && (
        <>
          {error && records.length > 0 && (
            <p className="font-mono text-xs mb-3" style={{ color: '#e87a5a' }}>{error}</p>
          )}
          <p className="font-mono text-xs mb-4" style={{ color: 'var(--muted)' }}>
            {filtered.length} CASE{filtered.length !== 1 ? 'S' : ''} · REALTDM: {caseCount}
            {propertySource != null && ` · PARCELS: ${propertySource.toUpperCase()}`}
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
              <p className="font-display text-3xl">NO MATCHES</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(r => (
                <article
                  key={r.case.caseId}
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
                          MIAMI-DADE · FL
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
                        href={REALFORECLOSE_URL}
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
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
