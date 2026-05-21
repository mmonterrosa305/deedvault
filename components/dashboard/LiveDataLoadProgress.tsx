'use client'

import { FL_REALTDM_COUNTY_COUNT } from '@/lib/realtdm'

type Props = {
  loadedCount: number
  totalCount?: number
  loadingParcels?: boolean
  loadingSourceNames?: string[]
}

export default function LiveDataLoadProgress({
  loadedCount,
  totalCount = FL_REALTDM_COUNTY_COUNT,
  loadingParcels = false,
  loadingSourceNames = [],
}: Props) {
  const pct = totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 0
  const inProgress = loadedCount < totalCount || loadingParcels
  const sourceHint =
    loadingSourceNames.length > 0
      ? loadingSourceNames.join(', ')
      : loadingParcels
        ? 'Miami-Dade parcel records'
        : null

  return (
    <div
      className="rounded-md px-4 py-6 mb-6"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border-bright)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      }}
    >
      <p className="font-mono text-xs tracking-widest mb-1 loading-gold-glow">
        LOADING LIVE DATA...
      </p>
      <p className="font-display text-2xl tracking-wide mb-4" style={{ color: 'var(--text)' }}>
        {loadedCount} of {totalCount} sources loaded
      </p>

      <div
        className="h-2 rounded-full overflow-hidden mb-4"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)' }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${loadedCount} of ${totalCount} sources loaded`}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--gold-dim), var(--gold))',
            boxShadow: inProgress ? '0 0 12px var(--gold-glow)' : 'none',
          }}
        />
      </div>

      <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
        {pct}% complete
        {sourceHint != null && inProgress && (
          <span className="block mt-1" style={{ color: 'var(--gold)' }}>
            Loading: {sourceHint}
          </span>
        )}
      </p>
    </div>
  )
}
