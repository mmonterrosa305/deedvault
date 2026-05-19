'use client'

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

export default function SearchSidebar({ filters, onChange, onReset }: Props) {
  const set = (patch: Partial<AdvancedFilters>) => onChange({ ...filters, ...patch })

  const toggleInList = (key: 'propTypes' | 'auctionTypes', value: string) => {
    const list = filters[key]
    const next = list.includes(value) ? list.filter(v => v !== value) : [...list, value]
    set({ [key]: next })
  }

  return (
    <aside
      className="w-full lg:w-64 flex-shrink-0 rounded-md p-4 h-fit lg:sticky lg:top-[7.5rem]"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>ADVANCED FILTERS</p>
        <button type="button" onClick={onReset} className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          RESET
        </button>
      </div>

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
    </aside>
  )
}