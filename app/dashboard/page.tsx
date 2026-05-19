'use client'

import { useState, useMemo } from 'react'

const LISTINGS = [
  { id:'FL-ALA-001', state:'FL', county:'Alachua',     addr:'2241 NW 23rd Blvd, Gainesville',        parcel:'07182-025-000',          auction:'Online', platform:'GovEase',              status:'Upcoming', date:'2025-06-12', minBid:8400,  assessed:62000,  prop:'Residential' },
  { id:'FL-BRO-001', state:'FL', county:'Broward',     addr:'1540 NW 7th Ave, Fort Lauderdale',       parcel:'50-42-34-0A-0360',       auction:'Online', platform:'RealTDX',             status:'Active',   date:'2025-05-28', minBid:22100, assessed:185000, prop:'Residential' },
  { id:'FL-DAD-001', state:'FL', county:'Miami-Dade',  addr:'8901 SW 152nd St, Miami',                parcel:'30-5921-000-0480',       auction:'Live',   platform:'Courthouse',          status:'Upcoming', date:'2025-07-09', minBid:15800, assessed:210000, prop:'Residential' },
  { id:'FL-DAD-002', state:'FL', county:'Miami-Dade',  addr:'14200 Biscayne Blvd, North Miami',       parcel:'07-2221-004-1360',       auction:'Online', platform:'RealTDX',             status:'Closed',   date:'2025-04-15', minBid:31500, assessed:420000, prop:'Commercial'  },
  { id:'FL-ORA-001', state:'FL', county:'Orange',      addr:'4800 Curry Ford Rd, Orlando',            parcel:'24-23-30-3270-00-400',   auction:'Online', platform:'GovEase',             status:'Upcoming', date:'2025-06-20', minBid:9200,  assessed:78000,  prop:'Residential' },
  { id:'FL-ORA-002', state:'FL', county:'Orange',      addr:'Vacant Lot, Apopka',                     parcel:'35-21-28-0000-00-085',   auction:'OCP',    platform:'County Clerk',        status:'Active',   date:'2025-05-01', minBid:2100,  assessed:14000,  prop:'Land'        },
  { id:'FL-HIL-001', state:'FL', county:'Hillsborough',addr:'3910 N 22nd St, Tampa',                  parcel:'126543.0000',            auction:'Online', platform:'Bid4Assets',          status:'Upcoming', date:'2025-07-14', minBid:11700, assessed:92000,  prop:'Residential' },
  { id:'FL-LEE-001', state:'FL', county:'Lee',         addr:'2130 Crystal Dr, Fort Myers',            parcel:'20-44-24-L3-00100',      auction:'Live',   platform:'Courthouse',          status:'Closed',   date:'2025-03-22', minBid:18200, assessed:155000, prop:'Residential' },
  { id:'FL-VOL-001', state:'FL', county:'Volusia',     addr:'500 Herbert St, Daytona Beach',          parcel:'5305-00-00-0010',        auction:'Online', platform:'GovEase',             status:'Upcoming', date:'2025-06-05', minBid:6300,  assessed:48000,  prop:'Commercial'  },
  { id:'FL-PAL-001', state:'FL', county:'Palm Beach',  addr:'1824 Lake Worth Rd, Lake Worth',         parcel:'38-43-44-17-06-023',     auction:'Online', platform:'RealTDX',             status:'Active',   date:'2025-05-30', minBid:27600, assessed:310000, prop:'Residential' },
  { id:'MI-WAY-001', state:'MI', county:'Wayne',       addr:'14501 Mack Ave, Detroit',                parcel:'21009161',               auction:'Online', platform:'Bid4Assets',          status:'Active',   date:'2025-06-03', minBid:5500,  assessed:38000,  prop:'Residential' },
  { id:'MI-WAY-002', state:'MI', county:'Wayne',       addr:'7200 W Chicago, Detroit',                parcel:'22014522',               auction:'Online', platform:'Bid4Assets',          status:'Upcoming', date:'2025-07-01', minBid:3200,  assessed:22000,  prop:'Residential' },
  { id:'MI-WAY-003', state:'MI', county:'Wayne',       addr:'Industrial Parcel, Dearborn',            parcel:'82011004',               auction:'Live',   platform:'Wayne Co. Treasurer', status:'Upcoming', date:'2025-07-08', minBid:19800, assessed:160000, prop:'Commercial'  },
  { id:'MI-OAK-001', state:'MI', county:'Oakland',     addr:'1020 N Adams Rd, Birmingham',            parcel:'67-25-18-476-021',       auction:'Online', platform:'SRI',                 status:'Closed',   date:'2025-04-28', minBid:44200, assessed:520000, prop:'Residential' },
  { id:'MI-OAK-002', state:'MI', county:'Oakland',     addr:'Vacant Land, Pontiac',                   parcel:'14-29-376-009',          auction:'OCP',    platform:'Oakland Co. Treasurer',status:'Active',  date:'2025-05-15', minBid:1800,  assessed:9500,   prop:'Land'        },
  { id:'MI-MAC-001', state:'MI', county:'Macomb',      addr:'25301 Harper Ave, St. Clair Shores',     parcel:'41-14-06-403-022',       auction:'Online', platform:'SRI',                 status:'Upcoming', date:'2025-06-18', minBid:16400, assessed:128000, prop:'Residential' },
  { id:'MI-GRK-001', state:'MI', county:'Kent',        addr:'1140 Bridge St NW, Grand Rapids',        parcel:'41-14-08-155-004',       auction:'Live',   platform:'Kent Co. Courthouse', status:'Upcoming', date:'2025-07-22', minBid:13100, assessed:98000,  prop:'Residential' },
  { id:'MI-ING-001', state:'MI', county:'Ingham',      addr:'703 Haslett Rd, East Lansing',           parcel:'33-20-02-05-201-049',    auction:'Online', platform:'SRI',                 status:'Closed',   date:'2025-03-10', minBid:9700,  assessed:74000,  prop:'Residential' },
  { id:'MI-WAS-001', state:'MI', county:'Washtenaw',   addr:'2340 Packard Rd, Ann Arbor',             parcel:'09-09-28-302-010',       auction:'Online', platform:'Bid4Assets',          status:'Active',   date:'2025-05-25', minBid:28900, assessed:295000, prop:'Residential' },
  { id:'FL-SAR-001', state:'FL', county:'Sarasota',    addr:'1702 Bahia Vista St, Sarasota',          parcel:'0058-14-0052',           auction:'Online', platform:'GovEase',             status:'Active',   date:'2025-05-22', minBid:19300, assessed:168000, prop:'Residential' },
]

const fmt = (n: number) => '$' + n.toLocaleString()
const fmtDate = (d: string) => { const [y,m,day] = d.split('-'); return `${m}/${day}/${y}` }

type Listing = typeof LISTINGS[0]

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    Active:   { background: 'rgba(58,170,110,.1)',  color: '#3aaa6e', border: '1px solid rgba(58,170,110,.25)' },
    Upcoming: { background: 'rgba(201,168,76,.08)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,.2)' },
    Closed:   { background: 'rgba(107,101,96,.1)',  color: 'var(--muted)', border: '1px solid var(--border)' },
  }
  return (
    <span className="font-mono text-xs px-2 py-0.5 rounded-sm" style={styles[status] ?? styles.Closed}>
      {status === 'Active' && <span className="gold-pulse inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />}
      {status.toUpperCase()}
    </span>
  )
}

function AuctionBadge({ type }: { type: string }) {
  const styles: Record<string, React.CSSProperties> = {
    Live:   { background: 'rgba(90,159,232,.1)',  color: '#5a9fe8', border: '1px solid rgba(90,159,232,.2)' },
    Online: { background: 'rgba(167,139,250,.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,.2)' },
    OCP:    { background: 'rgba(201,168,76,.08)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,.2)' },
  }
  return (
    <span className="font-mono text-xs px-2 py-0.5 rounded-sm" style={styles[type] ?? {}}>
      {type.toUpperCase()}
    </span>
  )
}

function ListingCard({ listing }: { listing: Listing }) {
  const ratio = ((listing.minBid / listing.assessed) * 100).toFixed(0)
  return (
    <div
      className="relative rounded-md p-4 transition-all cursor-pointer group"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* State accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-md opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: listing.state === 'FL' ? '#5a9fe8' : '#3aaa6e' }}
      />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="font-mono text-xs"
              style={{ color: listing.state === 'FL' ? '#5a9fe8' : '#3aaa6e' }}
            >
              {listing.state} — {listing.county.toUpperCase()}
            </span>
          </div>
          <p className="text-sm font-medium leading-snug truncate" style={{ color: 'var(--text)' }}>
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
          <span className="font-mono text-xs px-2 py-0.5 rounded-sm" style={{ background: 'rgba(255,255,255,.04)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            {listing.prop.toUpperCase()}
          </span>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
            {fmtDate(listing.date)}
          </div>
          <div className="font-mono text-xs" style={{ color: ratio <= '20' ? '#3aaa6e' : 'var(--muted)' }}>
            {ratio}% of assessed
          </div>
        </div>
      </div>

      <div className="mt-2 pt-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          {listing.platform}
        </span>
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          Assessed {fmt(listing.assessed)}
        </span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [q, setQ] = useState('')
  const [stateF, setStateF] = useState('')
  const [countyF, setCountyF] = useState('')
  const [auctionF, setAuctionF] = useState('')
  const [statusF, setStatusF] = useState('')
  const [propF, setPropF] = useState('')
  const [sort, setSort] = useState<'date'|'bid'|'assessed'>('date')

  const counties = useMemo(() => {
    const src = stateF ? LISTINGS.filter(r => r.state === stateF) : LISTINGS
    return [...new Set(src.map(r => r.county))].sort()
  }, [stateF])

  const filtered = useMemo(() => {
    let d = LISTINGS
    if (stateF)   d = d.filter(r => r.state === stateF)
    if (countyF)  d = d.filter(r => r.county === countyF)
    if (auctionF) d = d.filter(r => r.auction === auctionF)
    if (statusF)  d = d.filter(r => r.status === statusF)
    if (propF)    d = d.filter(r => r.prop === propF)
    if (q) {
      const lq = q.toLowerCase()
      d = d.filter(r =>
        r.addr.toLowerCase().includes(lq) ||
        r.county.toLowerCase().includes(lq) ||
        r.parcel.toLowerCase().includes(lq)
      )
    }
    if (sort === 'date')     d = [...d].sort((a,b) => a.date.localeCompare(b.date))
    if (sort === 'bid')      d = [...d].sort((a,b) => b.minBid - a.minBid)
    if (sort === 'assessed') d = [...d].sort((a,b) => b.assessed - a.assessed)
    return d
  }, [q, stateF, countyF, auctionF, statusF, propF, sort])

  const active   = LISTINGS.filter(r => r.status === 'Active').length
  const upcoming = LISTINGS.filter(r => r.status === 'Upcoming').length
  const fl = LISTINGS.filter(r => r.state === 'FL').length
  const mi = LISTINGS.filter(r => r.state === 'MI').length

  return (
    <div className="px-6 py-6 max-w-screen-xl mx-auto">

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { val: LISTINGS.length, label: 'Total listings' },
          { val: active,          label: 'Active now' },
          { val: upcoming,        label: 'Upcoming' },
          { val: `${fl} FL / ${mi} MI`, label: 'By state' },
        ].map(s => (
          <div key={s.label} className="rounded-md px-4 py-3" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
            <div className="font-display text-3xl tracking-wide" style={{ color: 'var(--gold)' }}>{s.val}</div>
            <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Search bar */}
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
          onClick={() => setQ('')}
          className="font-mono text-xs px-4 rounded transition-all"
          style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', height: '42px' }}
        >
          CLEAR
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        <select value={stateF} onChange={e => { setStateF(e.target.value); setCountyF('') }} style={{ flex: '1', minWidth: '120px' }}>
          <option value="">All states</option>
          <option value="FL">Florida</option>
          <option value="MI">Michigan</option>
        </select>
        <select value={countyF} onChange={e => setCountyF(e.target.value)} style={{ flex: '1', minWidth: '140px' }}>
          <option value="">All counties</option>
          {counties.map(c => <option key={c} value={c}>{c} Co.</option>)}
        </select>
        <select value={auctionF} onChange={e => setAuctionF(e.target.value)} style={{ flex: '1', minWidth: '130px' }}>
          <option value="">All auction types</option>
          <option value="Live">Live auction</option>
          <option value="Online">Online platform</option>
          <option value="OCP">Over-the-counter</option>
        </select>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ flex: '1', minWidth: '120px' }}>
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Closed">Closed</option>
        </select>
        <select value={propF} onChange={e => setPropF(e.target.value)} style={{ flex: '1', minWidth: '130px' }}>
          <option value="">All property types</option>
          <option value="Residential">Residential</option>
          <option value="Commercial">Commercial</option>
          <option value="Land">Land</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as 'date'|'bid'|'assessed')} style={{ flex: '1', minWidth: '130px' }}>
          <option value="date">Sort: date</option>
          <option value="bid">Sort: min bid ↓</option>
          <option value="assessed">Sort: assessed ↓</option>
        </select>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          {filtered.length} RECORD{filtered.length !== 1 ? 'S' : ''} FOUND
        </p>
        {(stateF || countyF || auctionF || statusF || propF || q) && (
          <button
            onClick={() => { setQ(''); setStateF(''); setCountyF(''); setAuctionF(''); setStatusF(''); setPropF('') }}
            className="font-mono text-xs transition-colors"
            style={{ background: 'none', border: 'none', color: 'var(--gold-dim)', cursor: 'pointer' }}
          >
            CLEAR ALL FILTERS ×
          </button>
        )}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--muted)' }}>
          <div className="font-display text-4xl tracking-wide mb-2">NO RECORDS</div>
          <div className="font-mono text-xs">Try adjusting your filters</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}
