'use client'

import { fmt } from '@/lib/listings'
import {
  LIVE_DATA_MAX_OPENING_BID,
  LIVE_DATA_MAX_RATIO_PCT,
  type LiveDataFilterState,
  type LiveDataSort,
  type LiveDataStateFilter,
} from '@/lib/live-data-feed'

type Props = {
  filters: LiveDataFilterState
  counties: string[]
  disabled?: boolean
  /** Hide state picker when FL/MI region tabs control state. */
  hideStateFilter?: boolean
  onChange: (filters: LiveDataFilterState) => void
  onReset: () => void
}

function MaxSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (n: number) => string
  disabled?: boolean
  onChange: (v: number) => void
}) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: 'var(--gold)' }}>
        {label}
      </p>
      <p className="font-mono text-xs mb-2" style={{ color: 'var(--text)' }}>
        {format(value)}
      </p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="vault-range w-full"
      />
      <div
        className="flex justify-between font-mono text-[10px] mt-1"
        style={{ color: 'var(--muted)' }}
      >
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}

export default function LiveDataFilters({
  filters,
  counties,
  disabled,
  hideStateFilter,
  onChange,
  onReset,
}: Props) {
  const set = (patch: Partial<LiveDataFilterState>) => onChange({ ...filters, ...patch })
  const filtersActive =
    filters.maxOpeningBid < LIVE_DATA_MAX_OPENING_BID ||
    filters.maxBidToAssessedPct < LIVE_DATA_MAX_RATIO_PCT ||
    filters.county !== '' ||
    (!hideStateFilter && filters.state !== 'all') ||
    filters.sort !== 'date'

  return (
    <div
      className="rounded-md p-4 mb-4"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : undefined,
      }}
      aria-disabled={disabled}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>
          FILTERS
        </p>
        <button
          type="button"
          onClick={onReset}
          disabled={disabled || !filtersActive}
          className="font-mono text-[10px] tracking-widest"
          style={{
            color: filtersActive ? 'var(--gold)' : 'var(--muted)',
            background: 'none',
            border: 'none',
            cursor: disabled || !filtersActive ? 'not-allowed' : 'pointer',
          }}
        >
          RESET
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        <MaxSlider
          label="MAX OPENING BID"
          value={filters.maxOpeningBid}
          min={0}
          max={LIVE_DATA_MAX_OPENING_BID}
          step={5000}
          format={fmt}
          disabled={disabled}
          onChange={maxOpeningBid => set({ maxOpeningBid })}
        />
        <MaxSlider
          label="MAX % OF ASSESSED VALUE"
          value={filters.maxBidToAssessedPct}
          min={0}
          max={LIVE_DATA_MAX_RATIO_PCT}
          step={1}
          format={n => `${n}%`}
          disabled={disabled}
          onChange={maxBidToAssessedPct => set({ maxBidToAssessedPct })}
        />
        <div>
          <p
            className="font-mono text-[10px] tracking-widest mb-2"
            style={{ color: 'var(--gold)' }}
          >
            COUNTY
          </p>
          <select
            value={filters.county}
            disabled={disabled}
            onChange={e => set({ county: e.target.value })}
            className="w-full font-mono text-xs px-3 py-2 rounded"
            style={{ height: '42px' }}
          >
            <option value="">All counties</option>
            {counties.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {!hideStateFilter && (
          <div>
            <p
              className="font-mono text-[10px] tracking-widest mb-2"
              style={{ color: 'var(--gold)' }}
            >
              STATE
            </p>
            <select
              value={filters.state}
              disabled={disabled}
              onChange={e => {
                const state = e.target.value as LiveDataStateFilter
                set({ state, county: '' })
              }}
              className="w-full font-mono text-xs px-3 py-2 rounded"
              style={{ height: '42px' }}
            >
              <option value="all">All</option>
              <option value="FL">FL</option>
              <option value="MI">MI</option>
            </select>
          </div>
        )}
        <div>
          <p
            className="font-mono text-[10px] tracking-widest mb-2"
            style={{ color: 'var(--gold)' }}
          >
            SORT BY
          </p>
          <select
            value={filters.sort}
            disabled={disabled}
            onChange={e => set({ sort: e.target.value as LiveDataSort })}
            className="w-full font-mono text-xs px-3 py-2 rounded"
            style={{ height: '42px' }}
          >
            <option value="date">Sale date (soonest)</option>
            <option value="bid-asc">Opening bid (low → high)</option>
            <option value="ratio-asc">% of assessed (low → high)</option>
          </select>
        </div>
      </div>
    </div>
  )
}
