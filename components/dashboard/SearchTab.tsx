'use client'

import { useState, useMemo } from 'react'
import { LISTINGS, daysUntilAuction, type Listing } from '@/lib/listings'
import ListingCard from '@/components/listing/ListingCard'
import PropertyModal from '@/components/listing/PropertyModal'
import SearchSidebar, { defaultAdvancedFilters, type AdvancedFilters } from '@/components/dashboard/SearchSidebar'

export default function SearchTab() {
  const [q, setQ] = useState('')
  const [stateF, setStateF] = useState('')
  const [countyF, setCountyF] = useState('')
  const [statusF, setStatusF] = useState('')
  const [sort, setSort] = useState<'date' | 'bid' | 'assessed'>('date')
  const [advanced, setAdvanced] = useState<AdvancedFilters>(defaultAdvancedFilters)
  const [selected, setSelected] = useState<Listing | null>(null)

  const counties = useMemo(() => {
    const src = stateF ? LISTINGS.filter(r => r.state === stateF) : LISTINGS
    return [...new Set(src.map(r => r.county))].sort()
  }, [stateF])

  const filtered = useMemo(() => {
    let d = [...LISTINGS]
    if (stateF) d = d.filter(r => r.state === stateF)
    if (countyF) d = d.filter(r => r.county === countyF)
    if (statusF) d = d.filter(r => r.status === statusF)
    if (q) {
      const lq = q.toLowerCase()
      d = d.filter(
        r =>
          r.addr.toLowerCase().includes(lq) ||
          r.county.toLowerCase().includes(lq) ||
          r.parcel.toLowerCase().includes(lq)
      )
    }
    d = d.filter(
      r =>
        r.minBid >= advanced.minBid &&
        r.minBid <= advanced.maxBid &&
        r.assessed >= advanced.minAssessed &&
        r.assessed <= advanced.maxAssessed &&
        daysUntilAuction(r.date) >= 0 &&
        daysUntilAuction(r.date) <= advanced.maxDaysUntil &&
        advanced.propTypes.includes(r.prop) &&
        advanced.auctionTypes.includes(r.auction)
    )
    if (sort === 'date') d.sort((a, b) => a.date.localeCompare(b.date))
    if (sort === 'bid') d.sort((a, b) => b.minBid - a.minBid)
    if (sort === 'assessed') d.sort((a, b) => b.assessed - a.assessed)
    return d
  }, [q, stateF, countyF, statusF, sort, advanced])

  const active = LISTINGS.filter(r => r.status === 'Active').length
  const upcoming = LISTINGS.filter(r => r.status === 'Upcoming').length
  const fl = LISTINGS.filter(r => r.state === 'FL').length
  const mi = LISTINGS.filter(r => r.state === 'MI').length

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1600px] mx-auto">
      {selected && <PropertyModal listing={selected} onClose={() => setSelected(null)} />}

      <div className="flex flex-col lg:flex-row gap-6">
        <SearchSidebar filters={advanced} onChange={setAdvanced} onReset={() => setAdvanced(defaultAdvancedFilters)} />

        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { val: LISTINGS.length, label: 'Total listings' },
              { val: active, label: 'Active now' },
              { val: upcoming, label: 'Upcoming' },
              { val: `${fl} FL / ${mi} MI`, label: 'By state' },
            ].map(s => (
              <div key={s.label} className="rounded-md px-4 py-3" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
                <div className="font-display text-3xl tracking-wide" style={{ color: 'var(--gold)' }}>{s.val}</div>
                <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by address, parcel ID, or county..."
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

          <div className="flex gap-2 flex-wrap mb-6">
            <select value={stateF} onChange={e => { setStateF(e.target.value); setCountyF('') }} style={{ flex: '1', minWidth: '120px' }}>
              <option value="">All states</option>
              <option value="FL">Florida</option>
              <option value="MI">Michigan</option>
            </select>
            <select value={countyF} onChange={e => setCountyF(e.target.value)} style={{ flex: '1', minWidth: '140px' }}>
              <option value="">All counties</option>
              {counties.map(c => (
                <option key={c} value={c}>{c} Co.</option>
              ))}
            </select>
            <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ flex: '1', minWidth: '120px' }}>
              <option value="">All statuses</option>
              <option value="Active">Active</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Closed">Closed</option>
            </select>
            <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} style={{ flex: '1', minWidth: '130px' }}>
              <option value="date">Sort: date</option>
              <option value="bid">Sort: min bid ↓</option>
              <option value="assessed">Sort: assessed ↓</option>
            </select>
          </div>

          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
              {filtered.length} RECORD{filtered.length !== 1 ? 'S' : ''} FOUND
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20" style={{ color: 'var(--muted)' }}>
              <div className="font-display text-4xl tracking-wide mb-2">NO RECORDS FOUND</div>
              <div className="font-mono text-xs mt-2 max-w-md mx-auto">
                Live data is available in the Live Data tab.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map(listing => (
                <ListingCard key={listing.id} listing={listing} onSelect={() => setSelected(listing)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

