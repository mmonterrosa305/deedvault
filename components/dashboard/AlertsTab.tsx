'use client'

import { useState } from 'react'
import { useDashboard } from '@/context/DashboardContext'
import { LISTINGS, fmt } from '@/lib/listings'

const COUNTIES = [...new Set(LISTINGS.map(l => l.county))].sort()

export default function AlertsTab() {
  const { alerts, addAlert, removeAlert, toggleAlert } = useDashboard()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [county, setCounty] = useState('Miami-Dade')
  const [state, setState] = useState('FL')
  const [maxBid, setMaxBid] = useState('50000')

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    addAlert({
      name: name.trim(),
      county,
      state,
      maxBid: maxBid ? Number(maxBid) : null,
      minBid: null,
      propTypes: [],
      auctionTypes: [],
      enabled: true,
    })
    setName('')
    setShowForm(false)
  }

  function matchCount(a: { county: string; state: string; maxBid: number | null }) {
    return LISTINGS.filter(l => {
      if (l.county !== a.county || l.state !== a.state) return false
      if (a.maxBid != null && l.minBid > a.maxBid) return false
      return true
    }).length
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold)' }}>ALERT RULES</p>
          <p className="font-mono text-xs mt-1" style={{ color: 'var(--muted)' }}>Get notified when new listings match your criteria</p>
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)} className="font-mono text-xs tracking-widest px-4 py-2 rounded w-full sm:w-auto" style={{ background: 'var(--gold)', color: '#0a0a0a', border: 'none', cursor: 'pointer' }}>
          {showForm ? 'CANCEL' : '+ NEW ALERT'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-md p-4 mb-6" style={{ background: 'var(--panel)', border: '1px solid var(--border-bright)' }}>
          <p className="font-mono text-xs tracking-widest mb-3" style={{ color: 'var(--gold)' }}>CREATE ALERT</p>
          <div className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Alert name" required className="w-full" />
            <div className="grid grid-cols-2 gap-2">
              <select value={state} onChange={e => setState(e.target.value)} className="w-full">
                <option value="FL">Florida</option>
                <option value="MI">Michigan</option>
              </select>
              <select value={county} onChange={e => setCounty(e.target.value)} className="w-full">
                {COUNTIES.filter(c => LISTINGS.some(l => l.county === c && l.state === state)).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <input type="number" value={maxBid} onChange={e => setMaxBid(e.target.value)} placeholder="Max bid ($)" className="w-full" />
            <button type="submit" className="w-full h-10 font-mono text-xs tracking-widest rounded" style={{ background: 'var(--gold)', color: '#0a0a0a', border: 'none', cursor: 'pointer' }}>SAVE ALERT</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {alerts.map(alert => (
          <div key={alert.id} className="rounded-md p-4" style={{ background: 'var(--panel)', border: '1px solid var(--border)', opacity: alert.enabled ? 1 : 0.55 }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{alert.name}</p>
                <p className="font-mono text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  {alert.county}, {alert.state}
                  {alert.maxBid != null ? ` · max bid ${fmt(alert.maxBid)}` : ''}
                </p>
                <p className="font-mono text-xs mt-2" style={{ color: 'var(--gold)' }}>
                  {matchCount(alert)} matching listing(s) now
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button type="button" onClick={() => toggleAlert(alert.id)} className="font-mono text-[10px] px-2 py-1 rounded" style={{ border: '1px solid var(--border)', color: alert.enabled ? '#3aaa6e' : 'var(--muted)', background: 'transparent', cursor: 'pointer' }}>
                  {alert.enabled ? 'ON' : 'OFF'}
                </button>
                <button type="button" onClick={() => removeAlert(alert.id)} className="font-mono text-[10px] px-2 py-1 rounded" style={{ border: '1px solid var(--border)', color: '#e87a5a', background: 'transparent', cursor: 'pointer' }}>DELETE</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
