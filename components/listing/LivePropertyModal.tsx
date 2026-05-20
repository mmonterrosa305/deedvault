'use client'

import { useState, useEffect } from 'react'
import type { MiamiDadeProperty } from '@/lib/miami-dade-api'
import { REALFORECLOSE_URL } from '@/lib/miami-dade-api'
import { fmt } from '@/lib/listings'
import { streetViewImageUrl } from '@/lib/listing-details'

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

function streetViewAddress(property: MiamiDadeProperty): string | null {
  const addr = property.siteAddress.trim()
  if (!addr || addr === 'Address not available') return null
  return addr.toLowerCase().includes('miami') ? addr : `${addr}, Miami, FL`
}

type Props = { property: MiamiDadeProperty; onClose: () => void }

export default function LivePropertyModal({ property, onClose }: Props) {
  const [photoError, setPhotoError] = useState(false)
  const viewAddr = streetViewAddress(property)
  const streetViewSrc = viewAddr ? streetViewImageUrl(viewAddr) : null

  useEffect(() => {
    setPhotoError(false)
  }, [property.folio])

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
      aria-labelledby="live-property-modal-title"
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.82)', animation: 'modalOverlayIn 0.2s ease-out' }} onClick={onClose} />
      <div
        className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-lg sm:rounded-lg overflow-hidden"
        style={{ background: '#111', border: '1px solid var(--border-bright)', boxShadow: '0 -8px 40px rgba(0,0,0,0.6)', animation: 'modalSlideUp 0.3s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
          <div className="min-w-0 pr-4">
            <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>{property.folio}</p>
            <h2 id="live-property-modal-title" className="font-display text-xl tracking-wide truncate" style={{ color: 'var(--text)' }}>
              MIAMI-DADE — FL
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded font-mono text-lg flex-shrink-0"
            style={{ border: '1px solid var(--border-bright)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-4">
          <ModalSection title="STREET VIEW">
            {!streetViewSrc ? (
              <p className="font-mono text-xs py-6 text-center" style={{ color: 'var(--muted)' }}>
                {!viewAddr
                  ? 'No site address on record for Street View.'
                  : 'Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for Street View.'}
              </p>
            ) : photoError ? (
              <p className="font-mono text-xs py-6 text-center" style={{ color: 'var(--muted)' }}>No Street View imagery for this address.</p>
            ) : (
              <>
                <div className="rounded-md overflow-hidden mb-2" style={{ border: '1px solid var(--border)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={streetViewSrc}
                    alt=""
                    onError={() => setPhotoError(true)}
                    onLoad={() => setPhotoError(false)}
                    className="w-full h-48 sm:h-56 object-cover"
                  />
                </div>
                <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Google Street View — {viewAddr}</p>
              </>
            )}
          </ModalSection>

          <ModalSection title="PROPERTY DETAILS">
            <DetailRow label="ADDRESS" value={property.siteAddress} />
            <DetailRow label="PARCEL ID (FOLIO)" value={property.folio} />
            <DetailRow label="OWNER" value={property.owner1} />
            <DetailRow
              label="TOTAL ASSESSED VALUE"
              value={property.totalValue != null ? fmt(property.totalValue) : '—'}
            />
            {property.landValue != null && <DetailRow label="LAND VALUE" value={fmt(property.landValue)} />}
            {property.buildingValue != null && <DetailRow label="BUILDING VALUE" value={fmt(property.buildingValue)} />}
            {property.taxYear && <DetailRow label="TAX YEAR" value={property.taxYear} />}
          </ModalSection>

          <ModalSection title="AUCTION & TAX DEED">
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              Search this folio on Miami-Dade&apos;s official tax deed and foreclosure auction site.
            </p>
            <a
              href={REALFORECLOSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs tracking-widest px-4 py-2.5 rounded transition-all inline-block text-center w-full sm:w-auto"
              style={{
                background: 'var(--gold-glow)',
                border: '1px solid rgba(201,168,76,0.35)',
                color: 'var(--gold)',
              }}
            >
              VIEW ON REALFORECLOSE →
            </a>
          </ModalSection>
        </div>
      </div>
    </div>
  )
}
