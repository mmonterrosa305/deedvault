'use client'

import { useEffect, useState } from 'react'
import type { MiamiDadeProperty } from '@/lib/miami-dade-api'
import { REALFORECLOSE_URL } from '@/lib/miami-dade-api'
import { fmt } from '@/lib/listings'

type ApiResponse = {
  properties: MiamiDadeProperty[]
  source?: 'primary' | 'fallback'
  count?: number
  error?: string
}

export default function LiveDataTab() {
  const [properties, setProperties] = useState<MiamiDadeProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'primary' | 'fallback' | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/miami-dade/properties')
        const data = (await res.json()) as ApiResponse
        if (!res.ok) throw new Error(data.error ?? 'Request failed')
        if (!cancelled) {
          setProperties(data.properties ?? [])
          setSource(data.source ?? null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load live data')
          setProperties([])
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

  const filtered = properties.filter(p => {
    if (!q) return true
    const lq = q.toLowerCase()
    return (
      p.folio.toLowerCase().includes(lq) ||
      p.siteAddress.toLowerCase().includes(lq) ||
      p.owner1.toLowerCase().includes(lq)
    )
  })

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>
          MIAMI-DADE COUNTY · LIVE OPEN DATA
        </p>
        <h2 className="font-display text-3xl tracking-wide mt-1" style={{ color: 'var(--text)' }}>
          REAL PROPERTY RECORDS
        </h2>
        <p className="font-mono text-xs mt-2 max-w-2xl" style={{ color: 'var(--muted)' }}>
          Fetched from the county ArcGIS FeatureServer. Folio, site address, owner, and assessed values.
          {source === 'fallback' && ' (Using county backup endpoint — primary MD_PropertyBoundary service unavailable.)'}
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Filter by folio, address, or owner..."
          className="flex-1"
          style={{ height: '42px', fontSize: '14px' }}
        />
        <button
          type="button"
          onClick={() => setQ('')}
          className="font-mono text-xs px-4 rounded"
          style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', height: '42px' }}
        >
          CLEAR
        </button>
      </div>

      {loading && (
        <div className="text-center py-20">
          <p className="font-mono text-xs animate-pulse" style={{ color: 'var(--gold)' }}>
            LOADING MIAMI-DADE RECORDS...
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-md px-4 py-8 text-center" style={{ background: 'var(--panel)', border: '1px solid rgba(232,122,90,0.3)' }}>
          <p className="font-mono text-xs" style={{ color: '#e87a5a' }}>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <p className="font-mono text-xs mb-4" style={{ color: 'var(--muted)' }}>
            {filtered.length} RECORD{filtered.length !== 1 ? 'S' : ''} · SOURCE: {source?.toUpperCase() ?? 'API'}
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
              <p className="font-display text-3xl">NO MATCHES</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => (
                <article
                  key={p.folio}
                  className="rounded-md p-4 transition-all"
                  style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs mb-1" style={{ color: '#5a9fe8' }}>
                        MIAMI-DADE · FL
                      </p>
                      <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text)' }}>
                        {p.siteAddress}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
                        <div>
                          <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>PARCEL ID (FOLIO)</p>
                          <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text)' }}>{p.folio}</p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>OWNER</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text)' }}>{p.owner1}</p>
                        </div>
                        {(p.landValue != null || p.buildingValue != null) && (
                          <>
                            {p.landValue != null && (
                              <div>
                                <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>LAND VALUE</p>
                                <p className="font-mono text-xs mt-0.5">{fmt(p.landValue)}</p>
                              </div>
                            )}
                            {p.buildingValue != null && (
                              <div>
                                <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>BUILDING VALUE</p>
                                <p className="font-mono text-xs mt-0.5">{fmt(p.buildingValue)}</p>
                              </div>
                            )}
                          </>
                        )}
                        {p.taxYear && (
                          <div>
                            <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>TAX YEAR</p>
                            <p className="font-mono text-xs mt-0.5">{p.taxYear}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>TOTAL ASSESSED</p>
                        <p className="font-display text-2xl tracking-wide" style={{ color: 'var(--gold)' }}>
                          {p.totalValue != null ? fmt(p.totalValue) : '—'}
                        </p>
                      </div>
                      <a
                        href={REALFORECLOSE_URL}
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
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

