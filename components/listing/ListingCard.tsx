'use client'

import type { Listing } from '@/lib/listings'
import { fmt, fmtDate } from '@/lib/listings'
import { AuctionBadge, StatusBadge } from '@/components/listing/ListingBadges'
import { useDashboard } from '@/context/DashboardContext'

type Props = {
  listing: Listing
  onSelect: () => void
}

export default function ListingCard({ listing, onSelect }: Props) {
  const { isSaved, toggleSave } = useDashboard()
  const ratio = ((listing.minBid / listing.assessed) * 100).toFixed(0)
  const saved = isSaved(listing.id)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className="relative rounded-md p-4 transition-all cursor-pointer group"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-md opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: listing.state === 'FL' ? '#5a9fe8' : '#3aaa6e' }}
      />

      <button
        type="button"
        onClick={e => {
          e.stopPropagation()
          toggleSave(listing.id)
        }}
        className="absolute top-3 right-3 z-10 font-mono text-xs px-2 py-1 rounded transition-all"
        style={{
          background: saved ? 'var(--gold-glow)' : 'rgba(0,0,0,0.5)',
          border: `1px solid ${saved ? 'var(--gold)' : 'var(--border)'}`,
          color: saved ? 'var(--gold)' : 'var(--muted)',
          cursor: 'pointer',
        }}
        title={saved ? 'Remove from saved' : 'Save property'}
      >
        {saved ? '★ SAVED' : '☆ SAVE'}
      </button>

      <div className="flex items-start justify-between gap-3 mb-3 pr-16">
        <div className="flex-1 min-w-0">
          <span
            className="font-mono text-xs"
            style={{ color: listing.state === 'FL' ? '#5a9fe8' : '#3aaa6e' }}
          >
            {listing.state} — {listing.county.toUpperCase()}
          </span>
          <p className="text-sm font-medium leading-snug truncate mt-1" style={{ color: 'var(--text)' }}>
            {listing.addr}
          </p>
          <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {listing.parcel}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-display text-2xl tracking-wide" style={{ color: 'var(--gold)' }}>
            {fmt(listing.minBid)}
          </div>
          <div className="font-mono text-xs" style={{ color: 'var(--muted)' }}>min bid</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          <AuctionBadge type={listing.auction} />
          <StatusBadge status={listing.status} />
          <span
            className="font-mono text-xs px-2 py-0.5 rounded-sm"
            style={{ background: 'rgba(255,255,255,.04)', color: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            {listing.prop.toUpperCase()}
          </span>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{fmtDate(listing.date)}</div>
          <div className="font-mono text-xs" style={{ color: ratio <= '20' ? '#3aaa6e' : 'var(--muted)' }}>
            {ratio}% of assessed
          </div>
        </div>
      </div>

      <div className="mt-2 pt-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{listing.platform}</span>
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Assessed {fmt(listing.assessed)}</span>
      </div>
    </div>
  )
}
