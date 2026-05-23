'use client'

import { useState } from 'react'
import { getListingById, fmt, fmtDate, daysUntilAuction } from '@/lib/listings'
import { useDashboard } from '@/context/DashboardContext'
import PropertyModal from '@/components/listing/PropertyModal'
import { AuctionBadge, StatusBadge } from '@/components/listing/ListingBadges'
import type { Listing } from '@/lib/listings'

export default function SavedTab() {
  const { saved, updateNotes, removeSaved } = useDashboard()
  const [selected, setSelected] = useState<Listing | null>(null)

  if (saved.length === 0) {
    return (
      <div className="px-4 py-16 max-w-2xl mx-auto text-center">
        <p className="font-display text-3xl sm:text-4xl tracking-wide mb-2" style={{ color: 'var(--muted)' }}>NO SAVED PROPERTIES</p>
        <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          Click SAVE on any listing in Search to add it here.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
      {selected && <PropertyModal listing={selected} onClose={() => setSelected(null)} />}
      <p className="font-mono text-xs tracking-widest mb-4" style={{ color: 'var(--gold)' }}>
        {saved.length} SAVED PROPERT{saved.length === 1 ? 'Y' : 'IES'}
      </p>
      <div className="space-y-4">
        {saved.map(item => {
          const listing = getListingById(item.listingId)
          if (!listing) return null
          const days = daysUntilAuction(listing.date)
          return (
            <div key={item.listingId} className="rounded-md p-4" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <button type="button" onClick={() => setSelected(listing)} className="text-left w-full" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <p className="font-mono text-xs mb-1" style={{ color: 'var(--gold)' }}>{listing.id}</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{listing.addr}</p>
                  </button>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <AuctionBadge type={listing.auction} />
                    <StatusBadge status={listing.status} />
                    <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{days >= 0 ? `${days}d to auction` : 'Past'}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-display text-2xl" style={{ color: 'var(--gold)' }}>{fmt(listing.minBid)}</p>
                  <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{fmtDate(listing.date)}</p>
                </div>
              </div>
              <label className="block">
                <span className="font-mono text-xs tracking-widest" style={{ color: 'var(--muted)' }}>NOTES</span>
                <textarea
                  value={item.notes}
                  onChange={e => updateNotes(item.listingId, e.target.value)}
                  placeholder="Add due diligence notes, bid strategy, contact info..."
                  rows={3}
                  className="w-full mt-1 resize-y"
                  style={{ minHeight: '72px', height: 'auto', padding: '10px 12px', fontSize: '13px' }}
                />
              </label>
              <div className="flex justify-end mt-3">
                <button type="button" onClick={() => removeSaved(item.listingId)} className="font-mono text-xs tracking-widest px-3 py-1 rounded" style={{ border: '1px solid var(--border)', color: '#e87a5a', background: 'transparent', cursor: 'pointer' }}>
                  REMOVE
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
