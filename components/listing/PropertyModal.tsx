'use client'

import { useState, useEffect } from 'react'
import type { Listing } from '@/lib/listings'
import { fmt, fmtDate } from '@/lib/listings'
import { getExtendedData, getBidSteps, streetViewImageUrl } from '@/lib/listing-details'
import { AuctionBadge, StatusBadge } from '@/components/listing/ListingBadges'
import { useDashboard } from '@/context/DashboardContext'

function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="font-mono text-xs tracking-widest mb-3 pb-2" style={{ color: 'var(--gold)', borderBottom: '1px solid var(--border)' }}>
        {title}
      </h3>
      {children}
    </section>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="font-mono text-xs tracking-wide" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

type Props = { listing: Listing; onClose: () => void }

export default function PropertyModal({ listing, onClose }: Props) {
  const { isSaved, toggleSave } = useDashboard()
  const ext = getExtendedData(listing)
  const steps = getBidSteps(listing.auction)
  const [photoError, setPhotoError] = useState(false)
  const streetViewSrc = streetViewImageUrl(listing.addr)
  const saved = isSaved(listing.id)

  useEffect(() => {
    setPhotoError(false)
  }, [listing.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
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
      aria-labelledby="property-modal-title"
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.82)', animation: 'modalOverlayIn 0.2s ease-out' }} onClick={onClose} />
      <div
        className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-lg sm:rounded-lg overflow-hidden"
        style={{ background: '#111', border: '1px solid var(--border-bright)', boxShadow: '0 -8px 40px rgba(0,0,0,0.6)', animation: 'modalSlideUp 0.3s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
          <div className="min-w-0 pr-4">
            <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>{listing.id}</p>
            <h2 id="property-modal-title" className="font-display text-xl tracking-wide truncate" style={{ color: 'var(--text)' }}>
              {listing.county.toUpperCase()} — {listing.state}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button type="button" onClick={() => toggleSave(listing.id)} className="font-mono text-xs px-3 py-1.5 rounded" style={{ border: `1px solid ${saved ? 'var(--gold)' : 'var(--border-bright)'}`, color: saved ? 'var(--gold)' : 'var(--muted)', background: saved ? 'var(--gold-glow)' : 'transparent', cursor: 'pointer' }}>
              {saved ? '★ SAVED' : '☆ SAVE'}
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 flex items-center justify-center rounded font-mono text-lg" style={{ border: '1px solid var(--border-bright)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}>×</button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-4">
          <ModalSection title="STREET VIEW">
            {!streetViewSrc ? (
              <p className="font-mono text-xs py-6 text-center" style={{ color: 'var(--muted)' }}>Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for Street View.</p>
            ) : photoError ? (
              <p className="font-mono text-xs py-6 text-center" style={{ color: 'var(--muted)' }}>No Street View imagery for this address.</p>
            ) : (
              <>
                <div className="rounded-md overflow-hidden mb-2" style={{ border: '1px solid var(--border)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={streetViewSrc} alt="" onError={() => setPhotoError(true)} onLoad={() => setPhotoError(false)} className="w-full h-48 sm:h-56 object-cover" />
                </div>
                <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Google Street View — {listing.addr}</p>
              </>
            )}
          </ModalSection>
          <ModalSection title="PROPERTY DETAILS">
            <DetailRow label="ADDRESS" value={listing.addr} />
            <DetailRow label="PARCEL ID" value={listing.parcel} />
            <DetailRow label="ASSESSED VALUE" value={fmt(listing.assessed)} />
            <DetailRow label="PROPERTY TYPE" value={listing.prop} />
            <DetailRow label="MINIMUM BID" value={fmt(listing.minBid)} />
            <div className="flex gap-2 mt-3"><AuctionBadge type={listing.auction} /><StatusBadge status={listing.status} /></div>
          </ModalSection>
          <ModalSection title="SKIP TRACE / OWNER INFO">
            <DetailRow label="PREVIOUS OWNER" value={ext.owner.name} />
            <DetailRow label="PHONE" value={ext.owner.phone} />
            <DetailRow label="MAILING ADDRESS" value={ext.owner.mailing} />
          </ModalSection>
          <ModalSection title="FINANCIAL INSTITUTION">
            <DetailRow label="LENDER" value={ext.lender.name} />
            <DetailRow label="MORTGAGE AMOUNT" value={fmt(ext.lender.mortgage)} />
            <DetailRow label="LOAN TYPE" value={ext.lender.loanType} />
          </ModalSection>
          <ModalSection title="HOW TO BID">
            <ol className="space-y-2">{steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm"><span className="font-mono text-xs w-6 h-6 flex items-center justify-center rounded" style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>{i + 1}</span><span>{step}</span></li>
            ))}</ol>
          </ModalSection>
          <ModalSection title="WHERE TO BID">
            <DetailRow label="PLATFORM" value={listing.platform} />
            <DetailRow label="AUCTION DATE" value={fmtDate(listing.date)} />
            <div className="py-2"><span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>WEBSITE </span><a href={ext.platformUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>{ext.platformUrl}</a></div>
          </ModalSection>
        </div>
      </div>
    </div>
  )
}
