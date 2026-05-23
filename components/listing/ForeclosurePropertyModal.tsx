'use client'

import { useEffect } from 'react'
import { fmt } from '@/lib/listings'
import PropertyPhotoSlideshow from '@/components/listing/PropertyPhotoSlideshow'
import { listingTypeLabel, type ForeclosureListing } from '@/lib/foreclosure-listing'

function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3
        className="font-mono text-xs tracking-widest mb-3 pb-2"
        style={{ color: 'var(--gold)', borderBottom: '1px solid var(--border)' }}
      >
        {title}
      </h3>
      {children}
    </section>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span className="font-mono text-xs tracking-wide" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <span className="text-sm" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

function streetViewAddress(address: string, state: 'FL' | 'MI'): string | null {
  const addr = address.trim()
  if (!addr || addr === '—' || addr === 'Address not available') return null
  if (/,\s*[A-Z]{2}\b/i.test(addr)) return addr
  return `${addr}, ${state}`
}

const DATE_LABEL: Record<ForeclosureListing['category'], string> = {
  auction: 'AUCTION DATE',
  'pre-foreclosure': 'EVENT DATE',
  'lis-pendens': 'FILING DATE',
}

type Props = { listing: ForeclosureListing; onClose: () => void }

export default function ForeclosurePropertyModal({ listing, onClose }: Props) {
  const viewAddr = streetViewAddress(listing.address, listing.state)
  const openingBid = listing.openingBid ?? listing.estimatedValue

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="foreclosure-modal-title"
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.82)', animation: 'modalOverlayIn 0.2s ease-out' }}
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-lg sm:rounded-lg overflow-hidden"
        style={{
          background: '#111',
          border: '1px solid var(--border-bright)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
          animation: 'modalSlideUp 0.3s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}
        >
          <div className="min-w-0 pr-4">
            <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>
              {listing.caseNumber}
            </p>
            <h2
              id="foreclosure-modal-title"
              className="font-display text-xl tracking-wide truncate"
              style={{ color: 'var(--text)' }}
            >
              {listing.county.toUpperCase()} — {listing.state}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded font-mono text-lg flex-shrink-0"
            style={{
              border: '1px solid var(--border-bright)',
              color: 'var(--muted)',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-4">
          <div
            className="mb-6 p-4 rounded-md text-center"
            style={{ background: 'var(--gold-glow)', border: '1px solid rgba(201,168,76,0.35)' }}
          >
            <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: 'var(--muted)' }}>
              OPENING BID
            </p>
            <p className="font-display text-3xl tracking-wide" style={{ color: 'var(--gold)' }}>
              {openingBid != null ? fmt(openingBid) : '—'}
            </p>
            <p className="font-mono text-xs mt-1" style={{ color: 'var(--muted)' }}>
              {listing.sourceLabel.toUpperCase()}
            </p>
          </div>

          <ModalSection title="PROPERTY PHOTOS">
            <PropertyPhotoSlideshow address={viewAddr} resetKey={listing.id} />
          </ModalSection>

          <ModalSection title="PROPERTY DETAILS">
            <DetailRow label="PROPERTY ADDRESS" value={listing.address} />
            <DetailRow label="PARCEL ID" value={listing.parcelId} />
            <DetailRow label="CASE NUMBER" value={listing.caseNumber} />
            {listing.estimatedValue != null && (
              <DetailRow
                label="ASSESSED / EST. VALUE"
                value={fmt(listing.estimatedValue)}
              />
            )}
            <DetailRow
              label="OPENING BID"
              value={listing.openingBid != null ? fmt(listing.openingBid) : '—'}
            />
            <DetailRow label={DATE_LABEL[listing.category]} value={listing.eventDateDisplay} />
            {listingTypeLabel(listing) && (
              <DetailRow label="TYPE" value={listingTypeLabel(listing)!} />
            )}
            <DetailRow label="COUNTY" value={listing.county} />
            <DetailRow label="STATE" value={listing.state} />
          </ModalSection>

          <ModalSection title="AUCTION">
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              Open this listing on the source platform for full case details and bidding.
            </p>
            <a
              href={listing.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs tracking-widest px-4 py-2.5 rounded transition-all inline-block text-center w-full sm:w-auto"
              style={{
                background: 'var(--gold-glow)',
                border: '1px solid rgba(201,168,76,0.35)',
                color: 'var(--gold)',
              }}
            >
              VIEW SOURCE →
            </a>
          </ModalSection>
        </div>
      </div>
    </div>
  )
}
