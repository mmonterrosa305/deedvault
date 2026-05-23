'use client'

import { useEffect } from 'react'
import { fmt } from '@/lib/listings'
import PropertyPhotoSlideshow from '@/components/listing/PropertyPhotoSlideshow'
import {
  feedItemAssessedValue,
  feedItemCounty,
  feedItemKey,
  feedItemOpeningBid,
  feedItemState,
  type LiveDataFeedItem,
} from '@/lib/live-data-feed'
import { BID4ASSETS_HOME_URL } from '@/lib/bid4assets'
import { GOVEASE_HOME_URL } from '@/lib/govease'
import { SRI_HOME_URL } from '@/lib/sri'

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

function feedItemTitle(item: LiveDataFeedItem): string {
  if (item.kind === 'realtdm') return item.record.case.caseNumber
  if (item.kind === 'realforeclose') return item.listing.caseNumber
  if (item.kind === 'govease') return item.listing.parcelNumber ?? item.listing.id
  if (item.kind === 'bid4assets') return item.listing.auctionTitle ?? item.listing.id
  return item.listing.parcelNumber ?? item.listing.id
}

function feedItemAddress(item: LiveDataFeedItem): string {
  if (item.kind === 'realtdm') return item.record.displayAddress
  return item.listing.address
}

function feedItemParcelId(item: LiveDataFeedItem): string {
  if (item.kind === 'realtdm') return item.record.case.parcelNumber
  if (item.kind === 'realforeclose') return item.listing.parcelId
  if (item.kind === 'govease') return item.listing.parcelNumber ?? '—'
  if (item.kind === 'sri') return item.listing.parcelNumber ?? '—'
  return '—'
}

function feedItemAuctionDate(item: LiveDataFeedItem): string {
  if (item.kind === 'realtdm') return item.record.case.saleDate
  if (item.kind === 'realforeclose') return item.listing.auctionDateTime || item.listing.auctionDate
  return item.listing.saleDate
}

function feedItemSourceLabel(item: LiveDataFeedItem): string {
  if (item.kind === 'realforeclose') return 'REALFORECLOSE'
  if (item.kind === 'govease') return 'GOVEASE'
  if (item.kind === 'bid4assets') return 'BID4ASSETS'
  return 'SRI'
}

function feedItemExternalLink(item: LiveDataFeedItem): { href: string; label: string } {
  if (item.kind === 'realforeclose') {
    return { href: item.listing.auctionUrl, label: 'VIEW ON REALFORECLOSE →' }
  }
  if (item.kind === 'govease') {
    return { href: GOVEASE_HOME_URL, label: 'VIEW ON GOVEASE →' }
  }
  if (item.kind === 'bid4assets') {
    const href = item.listing.auctionUrl ?? BID4ASSETS_HOME_URL
    return { href, label: 'VIEW ON BID4ASSETS →' }
  }
  if (item.kind === 'sri') {
    const href = item.listing.auctionUrl ?? SRI_HOME_URL
    return { href, label: 'VIEW ON SRI →' }
  }
  return { href: GOVEASE_HOME_URL, label: 'VIEW ON GOVEASE →' }
}

type Props = { item: LiveDataFeedItem; onClose: () => void }

export default function LiveFeedPropertyModal({ item, onClose }: Props) {
  const state = feedItemState(item)
  const county = feedItemCounty(item)
  const address = feedItemAddress(item)
  const openingBid = feedItemOpeningBid(item)
  const assessedValue = feedItemAssessedValue(item)
  const viewAddr = streetViewAddress(address, state)
  const { href: externalHref, label: externalLabel } = feedItemExternalLink(item)

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
      className="fixed inset-0 z-[100] flex flex-col sm:flex-row sm:items-center sm:justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-feed-modal-title"
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.82)', animation: 'modalOverlayIn 0.2s ease-out' }}
        onClick={onClose}
      />
      <div
        className="relative w-full h-full max-h-full flex flex-col overflow-hidden rounded-none sm:rounded-lg sm:h-auto sm:max-w-2xl sm:max-h-[88vh]"
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
              {feedItemTitle(item)}
            </p>
            <h2
              id="live-feed-modal-title"
              className="font-display text-xl tracking-wide truncate"
              style={{ color: 'var(--text)' }}
            >
              {county.toUpperCase()} — {state}
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
              {feedItemSourceLabel(item)}
            </p>
          </div>

          <ModalSection title="PROPERTY PHOTOS">
            <PropertyPhotoSlideshow address={viewAddr} resetKey={feedItemKey(item)} mobileFullBleed />
          </ModalSection>

          <ModalSection title="PROPERTY DETAILS">
            <DetailRow label="PROPERTY ADDRESS" value={address} />
            <DetailRow label="PARCEL ID" value={feedItemParcelId(item)} />
            <DetailRow
              label="ASSESSED VALUE"
              value={assessedValue != null ? fmt(assessedValue) : '—'}
            />
            <DetailRow
              label="OPENING BID"
              value={openingBid != null ? fmt(openingBid) : '—'}
            />
            <DetailRow label="AUCTION DATE" value={feedItemAuctionDate(item)} />
            <DetailRow label="COUNTY" value={county} />
            <DetailRow label="STATE" value={state} />
          </ModalSection>

          <ModalSection title="AUCTION">
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              Open this listing on the county auction platform for full case details and bidding.
            </p>
            <a
              href={externalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs tracking-widest px-4 py-2.5 rounded transition-all inline-block text-center w-full sm:w-auto"
              style={{
                background: 'var(--gold-glow)',
                border: '1px solid rgba(201,168,76,0.35)',
                color: 'var(--gold)',
              }}
            >
              {externalLabel}
            </a>
          </ModalSection>
        </div>
      </div>
    </div>
  )
}
