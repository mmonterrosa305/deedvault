'use client'

import { FL_REALTDM_COUNTY_COUNT } from '@/lib/realtdm'

type Props = {
  loadedCount: number
  totalCount?: number
  loadingCountyNames: string[]
  loadingParcels?: boolean
}

export default function LiveDataLoadProgress({
  loadedCount,
  totalCount = FL_REALTDM_COUNTY_COUNT,
  loadingCountyNames,
  loadingParcels = false,
}: Props) {
  const pct = totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 0
  const inProgress = loadedCount < totalCount || loadingParcels

  const fetchingLabel =
    loadingCountyNames.length > 0
      ? loadingCountyNames.length <= 3
        ? loadingCountyNames.join(', ')
        : `${loadingCountyNames.slice(0, 2).join(', ')} +${loadingCountyNames.length - 2} more`
      : loadingParcels
        ? 'Miami-Dade parcel records'
        : 'Finishing...'

  return (
    <div
      className="rounded-md px-4 py-6 mb-6"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border-bright)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      }}
    >
      <p className="font-mono text-xs tracking-widest mb-1" style={{ color: 'var(--gold)' }}>
        LOADING LIVE DATA
      </p>
      <p className="font-display text-2xl tracking-wide mb-4" style={{ color: 'var(--text)' }}>
        {loadedCount} of {totalCount} counties loaded
      </p>

      <div
        className="h-2 rounded-full overflow-hidden mb-4"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)' }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${loadedCount} of ${totalCount} counties loaded`}
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          {pct}% complete
        </p>
        {inProgress && (
          <p className="font-mono text-xs animate-pulse" style={{ color: 'var(--gold)' }}>
            Fetching: {fetchingLabel}
          </p>
        )}
      </div>

      {loadingParcels && loadedCount >= totalCount && (
        <p className="font-mono text-[10px] mt-3 tracking-wide" style={{ color: 'var(--muted)' }}>
          Merging Miami-Dade ArcGIS parcel data...
        </p>
      )}
    </div>
  )
}
