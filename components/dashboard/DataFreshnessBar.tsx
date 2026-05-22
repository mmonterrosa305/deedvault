'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDataAge } from '@/lib/format-data-age'

type Props = {
  lastUpdatedAt: number | null
  loading?: boolean
  onRefresh: () => void
}

export default function DataFreshnessBar({ lastUpdatedAt, loading, onRefresh }: Props) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (lastUpdatedAt == null) return
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [lastUpdatedAt])

  const ageLabel = useMemo(
    () => formatDataAge(lastUpdatedAt),
    [lastUpdatedAt, tick]
  )

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {lastUpdatedAt != null && !loading && ageLabel && (
        <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          Last updated {ageLabel}
        </p>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="font-mono text-xs tracking-widest px-4 py-2 rounded transition-all"
        style={{
          background: loading ? 'var(--panel)' : 'var(--gold-glow)',
          border: `1px solid ${loading ? 'var(--border)' : 'rgba(201,168,76,0.35)'}`,
          color: loading ? 'var(--muted)' : 'var(--gold)',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'REFRESHING…' : 'REFRESH DATA'}
      </button>
    </div>
  )
}
