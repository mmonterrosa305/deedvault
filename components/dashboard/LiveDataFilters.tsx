'use client'

import { useState } from 'react'
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
      <div className="flex justify-between font-mono text-[10px] mt-1" style={{ color: 'var(--muted)' }}>
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}

function FilterFields({
  filters,
  counties,
  disabled,
  hideStateFilter,
  onChange,
}: {
  filters: LiveDataFilterState
  counties: string[]
  disabled?: boolean
  hideStateFilter?: boolean
  onChange: (filters: LiveDataFilterState) => void
}) {
  const set = (patch: Partial<LiveDataFilterState>) => onChange({ ...filters, ...patch })

  return (
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
        <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: 'var(--gold)' }}>
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
          <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: 'var(--gold)' }}>
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
        <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: 'var(--gold)' }}>
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
  const [mobileOpen, setMobileOpen] = useState(false)

  const filtersActive =
    filters.maxOpeningBid < LIVE_DATA_MAX_OPENING_BID ||
    filters.maxBidToAssessedPct < LIVE_DATA_MAX_RATIO_PCT ||
    filters.county !== '' ||
    (!hideStateFilter && filters.state !== 'all') ||
    filters.sort !== 'date'

  const panelHeader = (showClose: boolean) => (
    <div className="flex items-center justify-between mb-4">
      <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>
        FILTERS
      </p>
      <div className="flex items-center gap-3">
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
        {showClose && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="font-mono text-[10px] tracking-widest"
            style={{
              color: 'var(--muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
        )}
      </div>
    </div>
  )

  const panelBody = (
    <FilterFields
      filters={filters}
      counties={counties}
      disabled={disabled}
      hideStateFilter={hideStateFilter}
      onChange={onChange}
    />
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        disabled={disabled}
        className="md:hidden w-full mb-4 font-mono text-xs tracking-widest px-4 py-2.5 rounded transition-all"
        style={{
          background: filtersActive ? 'var(--gold-glow)' : 'var(--panel)',
          border: `1px solid ${filtersActive ? 'rgba(201,168,76,0.35)' : 'var(--border)'}`,
          color: filtersActive ? 'var(--gold)' : 'var(--muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          height: '42px',
        }}
      >
        FILTERS{filtersActive ? ' · ACTIVE' : ''}
      </button>

      {mobileOpen && !disabled && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div
            className="relative max-h-[85vh] overflow-y-auto rounded-t-lg p-4"
            style={{
              background: '#111',
              border: '1px solid var(--border-bright)',
              borderBottom: 'none',
              animation: 'modalSlideUp 0.3s ease-out',
            }}
          >
            {panelHeader(true)}
            {panelBody}
          </div>
        </div>
      )}

      <div
        className="hidden md:block rounded-md p-4 mb-4"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? 'none' : undefined,
        }}
        aria-disabled={disabled}
      >
        {panelHeader(false)}
        {panelBody}
      </div>
    </>
  )
}
