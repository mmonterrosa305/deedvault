'use client'

import {
  MI_TARGET_COUNTIES,
  PLATFORM_LABEL,
  type MichiganCountyInfo,
} from '@/lib/michigan-counties'

function PlatformBadge({ county }: { county: MichiganCountyInfo }) {
  return (
    <span
      className="font-mono text-[10px] px-2 py-0.5 rounded-sm inline-block"
      style={{
        background: county.hasLiveConnector
          ? 'rgba(58,170,110,0.12)'
          : 'rgba(201,168,76,0.12)',
        color: county.hasLiveConnector ? '#3aaa6e' : 'var(--gold)',
        border: `1px solid ${county.hasLiveConnector ? 'rgba(58,170,110,0.25)' : 'rgba(201,168,76,0.25)'}`,
      }}
    >
      {PLATFORM_LABEL[county.platform].toUpperCase()}
      {county.hasLiveConnector ? ' · LIVE' : ''}
    </span>
  )
}

export default function MichiganCountyDirectory() {
  return (
    <div className="space-y-3">
      <p className="font-mono text-xs max-w-3xl" style={{ color: 'var(--muted)' }}>
        Michigan tax deed sales follow circuit-court foreclosure judgment, then county treasurer
        auction. Mortgage foreclosure sales are separate judicial/sheriff processes — links below
        point to each county&apos;s treasurer and circuit court resources.
      </p>
      <div className="space-y-3">
        {MI_TARGET_COUNTIES.map(county => (
          <article
            key={county.key}
            className="rounded-md p-4"
            style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="font-display text-lg tracking-wide" style={{ color: 'var(--text)' }}>
                {county.name.toUpperCase()} COUNTY
              </h3>
              <PlatformBadge county={county} />
            </div>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--muted)' }}>
              {county.platformNotes}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              <div>
                <p className="tracking-widest mb-1" style={{ color: 'var(--muted)' }}>
                  TAX DEED / FORFEITURE AUCTION
                </p>
                <a
                  href={county.taxDeedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--gold)' }}
                >
                  {county.taxDeedUrl.replace(/^https?:\/\//, '')} →
                </a>
              </div>
              <div>
                <p className="tracking-widest mb-1" style={{ color: 'var(--muted)' }}>
                  FORECLOSURE / SURPLUS INFO
                </p>
                <a
                  href={county.foreclosureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--gold)' }}
                >
                  Treasurer / claims page →
                </a>
              </div>
              <div className="sm:col-span-2">
                <p className="tracking-widest mb-1" style={{ color: 'var(--muted)' }}>
                  CIRCUIT COURT
                </p>
                <a
                  href={county.circuitCourtUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--gold)' }}
                >
                  {county.circuitCourtUrl.replace(/^https?:\/\//, '')} →
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
