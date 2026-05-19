'use client'

import { useState } from 'react'

export default function SettingsTab() {
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [defaultState, setDefaultState] = useState('FL')
  const [saved, setSaved] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-xl mx-auto">
      <p className="font-mono text-xs tracking-widest mb-6" style={{ color: 'var(--gold)' }}>SETTINGS</p>
      <form onSubmit={handleSave} className="rounded-md p-5 space-y-5" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <span className="font-mono text-xs" style={{ color: 'var(--text)' }}>Email alert notifications</span>
          <input type="checkbox" checked={emailAlerts} onChange={e => setEmailAlerts(e.target.checked)} className="vault-checkbox" />
        </label>
        <label className="block">
          <span className="font-mono text-xs tracking-widest block mb-2" style={{ color: 'var(--muted)' }}>DEFAULT STATE FILTER</span>
          <select value={defaultState} onChange={e => setDefaultState(e.target.value)} className="w-full">
            <option value="FL">Florida</option>
            <option value="MI">Michigan</option>
            <option value="">All states</option>
          </select>
        </label>
        <label className="block">
          <span className="font-mono text-xs tracking-widest block mb-2" style={{ color: 'var(--muted)' }}>CLAUDE API KEY (future)</span>
          <input type="password" placeholder="sk-ant-..." disabled className="w-full opacity-50" />
          <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--muted)' }}>Agent tab uses demo responses until configured.</p>
        </label>
        <button type="submit" className="w-full h-10 font-mono text-xs tracking-widest rounded" style={{ background: 'var(--gold)', color: '#0a0a0a', border: 'none', cursor: 'pointer' }}>
          {saved ? 'SAVED ✓' : 'SAVE PREFERENCES'}
        </button>
      </form>
    </div>
  )
}
