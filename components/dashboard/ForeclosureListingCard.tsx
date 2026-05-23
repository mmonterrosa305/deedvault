'use client'

import { type CSSProperties, type KeyboardEvent } from 'react'
import { fmt } from '@/lib/listings'
import {
  bidToAssessedRatio,
  formatBidToAssessedPct,
  isGoodDealRatio,
} from '@/lib/foreclosure-feed'
import { listingTypeLabel, type ForeclosureListing } from '@/lib/foreclosure-listing'

function feedCardStyle(isGoodDeal: boolean): CSSProperties {
  return {
    background: isGoodDeal ? 'var(--gold-glow)' : 'var(--panel)',
    border: `1px solid ${isGoodDeal ? 'rgba(201,168,76,0.45)' : 'var(--border)'}`,
  }
}

function feedCardHoverBorder(isGoodDeal: boolean): string {
  return isGoodDeal ? 'rgba(201,168,76,0.65)' : 'var(--gold-dim)'
}

function GoodDealBadge() {
  return (
    <span
      className="font-mono text-[10px] px-2 py-0.5 rounded-sm"
      style={{
        background: 'var(--gold-glow)',
        color: 'var(--gold)',
        border: '1px solid rgba(201,168,76,0.45)',
      }}
    >
      GOOD DEAL
    </span>
  )
}

function OpeningBidHighlight({
  openingBid,
  label,
}: {
  openingBid: number | null
  label: string
}) {
  return (
    <div
      className="mb-4 p-4 rounded-md text-center w-full"
      style={{ background: 'var(--gold-glow)', border: '1px solid rgba(201,168,76,0.35)' }}
    >
      <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p className="font-display text-3xl tracking-wide" style={{ color: 'var(--gold)' }}>
        {openingBid != null ? fmt(openingBid) : '—'}
      </p>
    </div>
  )
}

function AssessedRatioBlock({
  openingBid,
  estimatedValue,
}: {
  openingBid: number | null
  estimatedValue: number | null
}) {
  const ratio = bidToAssessedRatio(openingBid, estimatedValue)
  if (ratio == null) return null
  const isGoodDeal = isGoodDealRatio(ratio)
  return (
    <div className="text-right">
      <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
        % OF ASSESSED VALUE
      </p>
      <p
        className="font-mono text-sm mt-0.5"
        style={{ color: isGoodDeal ? 'var(--gold)' : 'var(--text)' }}
      >
        {formatBidToAssessedPct(ratio)}
      </p>
    </div>
  )
}

const CATEGORY_LABEL: Record<ForeclosureListing['category'], string> = {
  auction: 'AUCTION',
  'pre-foreclosure': 'PRE-FORECLOSURE',
  'lis-pendens': 'LIS PENDENS',
}

const DATE_LABEL: Record<ForeclosureListing['category'], string> = {
  auction: 'AUCTION DATE & TIME',
  'pre-foreclosure': 'EVENT DATE',
  'lis-pendens': 'FILING DATE',
}

type Props = {
  listing: ForeclosureListing
  onSelect?: () => void
}

export default function ForeclosureListingCard({ listing, onSelect }: Props) {
  const ratio = bidToAssessedRatio(listing.openingBid, listing.estimatedValue)
  const isGoodDeal = isGoodDealRatio(ratio)
  const bidLabel =
    listing.category === 'lis-pendens' && listing.openingBid == null
      ? 'OPENING BID / EST. VALUE'
      : 'OPENING BID'

  const displayBid = listing.openingBid ?? listing.estimatedValue

  const cardProps = onSelect
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick: onSelect,
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect()
          }
        },
        className: 'rounded-md p-4 transition-all cursor-pointer h-full min-w-0',
      }
    : { className: 'rounded-md p-4 transition-all h-full min-w-0' }

  return (
    <article
      {...cardProps}
      style={feedCardStyle(isGoodDeal)}
      onMouseEnter={e => (e.currentTarget.style.borderColor = feedCardHoverBorder(isGoodDeal))}
      onMouseLeave={e =>
        (e.currentTarget.style.borderColor = isGoodDeal
          ? 'rgba(201,168,76,0.45)'
          : 'var(--border)')
      }
    >
      <OpeningBidHighlight openingBid={displayBid} label={bidLabel} />
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="font-mono text-xs" style={{ color: '#5a9fe8' }}>
              {listing.county.toUpperCase()} · {listing.state} · {listing.sourceLabel.toUpperCase()}
            </p>
            <span
              className="font-mono text-[10px] px-2 py-0.5 rounded-sm"
              style={{
                background: 'rgba(90,159,232,0.12)',
                color: '#5a9fe8',
                border: '1px solid rgba(90,159,232,0.25)',
              }}
            >
              {CATEGORY_LABEL[listing.category]}
            </span>
            {isGoodDeal && <GoodDealBadge />}
          </div>
          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text)' }}>
            {listing.address}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                COUNTY
              </p>
              <p className="font-mono text-xs mt-0.5">{listing.county}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                CASE NUMBER
              </p>
              <p className="font-mono text-xs mt-0.5">{listing.caseNumber}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                PARCEL ID
              </p>
              <p className="font-mono text-xs mt-0.5">{listing.parcelId}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                {DATE_LABEL[listing.category]}
              </p>
              <p className="font-mono text-xs mt-0.5">{listing.eventDateDisplay}</p>
            </div>
            {listing.estimatedValue != null && listing.openingBid != null && (
              <div>
                <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                  ASSESSED / EST. VALUE
                </p>
                <p className="font-mono text-xs mt-0.5">{fmt(listing.estimatedValue)}</p>
              </div>
            )}
            {listingTypeLabel(listing) && (
              <div>
                <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
                  TYPE
                </p>
                <p className="font-mono text-xs mt-0.5">{listingTypeLabel(listing)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <AssessedRatioBlock
            openingBid={listing.openingBid}
            estimatedValue={listing.estimatedValue}
          />
          <a
            href={listing.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="font-mono text-xs tracking-widest px-4 py-2 rounded transition-all inline-block text-center"
            style={{
              background: 'var(--gold-glow)',
              border: '1px solid rgba(201,168,76,0.35)',
              color: 'var(--gold)',
            }}
          >
            VIEW SOURCE →
          </a>
        </div>
      </div>
    </article>
  )
}
