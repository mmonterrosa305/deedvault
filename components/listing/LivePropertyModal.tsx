'use client'

import { useEffect } from 'react'
import { REALFORECLOSE_URL } from '@/lib/miami-dade-api'
import { fmt } from '@/lib/listings'
import PropertyPhotoSlideshow from '@/components/listing/PropertyPhotoSlideshow'
import type { LiveDataRecord } from '@/lib/live-data-merge'
import { caseUniqueId, countyBaseUrl } from '@/lib/realtdm'

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

function streetViewAddress(address: string): string | null {
  const addr = address.trim()
  if (!addr || addr === 'Address not available') return null
  if (/,\s*[A-Z]{2}\b/i.test(addr) || addr.toLowerCase().includes('fl')) return addr
  return `${addr}, FL`
}

type Props = { record: LiveDataRecord; onClose: () => void }

export default function LivePropertyModal({ record, onClose }: Props) {
  const { case: taxCase, property, displayAddress } = record
  const viewAddr = streetViewAddress(displayAddress)

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
      aria-labelledby="live-property-modal-title"
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
              {taxCase.caseNumber}
            </p>
            <h2
              id="live-property-modal-title"
              className="font-display text-xl tracking-wide truncate"
              style={{ color: 'var(--text)' }}
            >
              {taxCase.county.toUpperCase()} — FL
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
              {taxCase.openingBid != null ? fmt(taxCase.openingBid) : '—'}
            </p>
            <p className="font-mono text-xs mt-1" style={{ color: 'var(--muted)' }}>
              {taxCase.status}
            </p>
          </div>

          <ModalSection title="PROPERTY PHOTOS">
            <PropertyPhotoSlideshow
              address={viewAddr}
              resetKey={caseUniqueId(taxCase)}
              mobileFullBleed
            />
          </ModalSection>

          <ModalSection title="TAX DEED CASE (REALTDM)">
            <DetailRow label="COUNTY" value={taxCase.county} />
            <DetailRow label="CASE NUMBER" value={taxCase.caseNumber} />
            <DetailRow label="PARCEL NUMBER" value={taxCase.parcelNumber} />
            <DetailRow label="PROPERTY ADDRESS" value={displayAddress} />
            <DetailRow label="SALE DATE" value={taxCase.saleDate} />
            <DetailRow label="STATUS" value={taxCase.status} />
            <DetailRow
              label="OPENING BID"
              value={taxCase.openingBid != null ? fmt(taxCase.openingBid) : '—'}
            />
          </ModalSection>

          {property && taxCase.countyKey === 'miamidade' && (
            <ModalSection title="PARCEL RECORD (MIAMI-DADE GIS)">
              <DetailRow label="FOLIO" value={property.folio} />
              <DetailRow label="OWNER" value={property.owner1} />
              <DetailRow
                label="TOTAL ASSESSED VALUE"
                value={property.totalValue != null ? fmt(property.totalValue) : '—'}
              />
              {property.landValue != null && (
                <DetailRow label="LAND VALUE" value={fmt(property.landValue)} />
              )}
              {property.buildingValue != null && (
                <DetailRow label="BUILDING VALUE" value={fmt(property.buildingValue)} />
              )}
            </ModalSection>
          )}

          <ModalSection title="AUCTION & TAX DEED">
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              {taxCase.countyKey === 'miamidade'
                ? "Search this parcel on Miami-Dade's official tax deed and foreclosure auction site."
                : `Open ${taxCase.county} County's public RealTDM case search.`}
            </p>
            <a
              href={
                taxCase.countyKey === 'miamidade'
                  ? REALFORECLOSE_URL
                  : `${countyBaseUrl({ key: taxCase.countyKey, name: taxCase.county, subdomain: taxCase.subdomain })}/public/cases/list`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs tracking-widest px-4 py-2.5 rounded transition-all inline-block text-center w-full sm:w-auto"
              style={{
                background: 'var(--gold-glow)',
                border: '1px solid rgba(201,168,76,0.35)',
                color: 'var(--gold)',
              }}
            >
              {taxCase.countyKey === 'miamidade'
                ? 'VIEW ON REALFORECLOSE →'
                : 'VIEW ON REALTDM →'}
            </a>
          </ModalSection>
        </div>
      </div>
    </div>
  )
}
