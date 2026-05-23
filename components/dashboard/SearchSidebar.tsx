'use client'

import { useState } from 'react'
import { fmt, LISTING_MAX_BID, LISTING_MAX_ASSESSED, PROPERTY_TYPES, AUCTION_TYPES } from '@/lib/listings'

export type AdvancedFilters = {
  minBid: number
  maxBid: number
  minAssessed: number
  maxAssessed: number
  maxDaysUntil: number
  propTypes: string[]
  auctionTypes: string[]
}

export const defaultAdvancedFilters: AdvancedFilters = {
  minBid: 0,
  maxBid: LISTING_MAX_BID,
  minAssessed: 0,
  maxAssessed: LISTING_MAX_ASSESSED,
  maxDaysUntil: 120,
  propTypes: [...PROPERTY_TYPES],
  auctionTypes: [...AUCTION_TYPES],
}

type Props = {
  filters: AdvancedFilters
  onChange: (f: AdvancedFilters) => void
  onReset: () => void
}

function RangeFilter({
  label,
  min,
  max,
  valueMin,
  valueMax,
  onMin,
  onMax,
  format = (n: number) => String(n),
}: {
  label: string
  min: number
  max: number
  valueMin: number
  valueMax: number
  onMin: (v: number) => void
  onMax: (v: number) => void
  format?: (n: number) => string
}) {
  return (
    <div className="mb-5">
      <p className="font-mono text-xs tracking-widest mb-2" style={{ color: 'var(--gold)' }}>{label}</p>
      <div className="flex justify-between font-mono text-xs mb-1" style={{ color: 'var(--muted)' }}>
        <span>{format(valueMin)}</span>
        <span>{format(valueMax)}</span>
      </div>
      <input type="range" min={min} max={max} step={max > 10000 ? 1000 : 100} value={valueMin} onChange={e => onMin(Math.min(Number(e.target.value), valueMax))} className="vault-range w-full mb-1" />
      <input type="range" min={min} max={max} step={max > 10000 ? 1000 : 100} value={valueMax} onChange={e => onMax(Math.max(Number(e.target.value), valueMin))} className="vault-range w-full" />
    </div>
  )
}

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: readonly string[]
  selected: string[]
  onToggle: (opt: string) => void
}) {
  return (
    <div className="mb-5">
      <p className="font-mono text-xs tracking-widest mb-2" style={{ color: 'var(--gold)' }}>{label}</p>
      <div className="space-y-2">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer font-mono text-xs" style={{ color: 'var(--text)' }}>
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onToggle(opt)}
              className="vault-checkbox"
            />
            {opt.toUpperCase()}
          </label>
        ))}
      </div>
    </div>
  )
}

function SidebarFields({
  filters,
  onChange,
}: {
  filters: AdvancedFilters
  onChange: (f: AdvancedFilters) => void
}) {
  const set = (patch: Partial<AdvancedFilters>) => onChange({ ...filters, ...patch })

  const toggleInList = (key: 'propTypes' | 'auctionTypes', value: string) => {
    const list = filters[key]
    const next = list.includes(value) ? list.filter(v => v !== value) : [...list, value]
    set({ [key]: next })
  }

  return (
    <>
      <RangeFilter label="MIN / MAX BID" min={0} max={LISTING_MAX_BID} valueMin={filters.minBid} valueMax={filters.maxBid} onMin={v => set({ minBid: v })} onMax={v => set({ maxBid: v })} format={fmt} />
      <RangeFilter label="MIN / MAX ASSESSED" min={0} max={LISTING_MAX_ASSESSED} valueMin={filters.minAssessed} valueMax={filters.maxAssessed} onMin={v => set({ minAssessed: v })} onMax={v => set({ maxAssessed: v })} format={fmt} />

      <div className="mb-5">
        <p className="font-mono text-xs tracking-widest mb-2" style={{ color: 'var(--gold)' }}>DAYS UNTIL AUCTION</p>
        <div className="flex justify-between font-mono text-xs mb-1" style={{ color: 'var(--muted)' }}>
          <span>0 days</span>
          <span>≤ {filters.maxDaysUntil} days</span>
        </div>
        <input type="range" min={1} max={120} value={filters.maxDaysUntil} onChange={e => set({ maxDaysUntil: Number(e.target.value) })} className="vault-range w-full" />
      </div>

      <CheckboxGroup label="PROPERTY TYPE" options={PROPERTY_TYPES} selected={filters.propTypes} onToggle={v => toggleInList('propTypes', v)} />
      <CheckboxGroup label="AUCTION TYPE" options={AUCTION_TYPES} selected={filters.auctionTypes} onToggle={v => toggleInList('auctionTypes', v)} />
    </>
  )
}

export default function SearchSidebar({ filters, onChange, onReset }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const filtersActive =
    filters.minBid > 0 ||
    filters.maxBid < LISTING_MAX_BID ||
    filters.minAssessed > 0 ||
    filters.maxAssessed < LISTING_MAX_ASSESSED ||
    filters.maxDaysUntil < 120 ||
    filters.propTypes.length !== PROPERTY_TYPES.length ||
    filters.auctionTypes.length !== AUCTION_TYPES.length

  const panelHeader = (showClose: boolean) => (
    <div className="flex items-center justify-between mb-4">
      <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>ADVANCED FILTERS</p>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onReset} className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          RESET
        </button>
        {showClose && (
          <button type="button" onClick={() => setMobileOpen(false)} className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            CLOSE
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden w-full mb-4 font-mono text-xs tracking-widest px-4 py-2.5 rounded"
        style={{
          background: filtersActive ? 'var(--gold-glow)' : 'var(--panel)',
          border: `1px solid ${filtersActive ? 'rgba(201,168,76,0.35)' : 'var(--border)'}`,
          color: filtersActive ? 'var(--gold)' : 'var(--muted)',
          cursor: 'pointer',
          height: '42px',
        }}
      >
        FILTERS{filtersActive ? ' · ACTIVE' : ''}
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setMobileOpen(false)} aria-hidden />
          <aside
            className="relative max-h-[85vh] overflow-y-auto rounded-t-lg p-4 w-full"
            style={{
              background: '#111',
              border: '1px solid var(--border-bright)',
              borderBottom: 'none',
              animation: 'modalSlideUp 0.3s ease-out',
            }}
          >
            {panelHeader(true)}
            <SidebarFields filters={filters} onChange={onChange} />
          </aside>
        </div>
      )}

      <aside
        className="hidden lg:block w-full lg:w-64 flex-shrink-0 rounded-md p-4 h-fit lg:sticky lg:top-[7.5rem]"
        style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
      >
        {panelHeader(false)}
        <SidebarFields filters={filters} onChange={onChange} />
      </aside>
    </>
  )
}
