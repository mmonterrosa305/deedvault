'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useDashboard, type TabId } from '@/context/DashboardContext'

const TABS: { id: TabId; label: string }[] = [
  { id: 'search', label: 'Search' },
  { id: 'saved', label: 'Saved Properties' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'agent', label: 'Chat' },
  { id: 'live', label: 'Tax Deeds' },
  { id: 'foreclosures', label: 'Foreclosures' },
  { id: 'settings', label: 'Settings' },
]

const LIVE_STYLE_TABS: TabId[] = ['live', 'foreclosures']

export default function DashboardTabNav() {
  const { activeTab, setActiveTab, saved, alerts } = useDashboard()
  const router = useRouter()
  const searchParams = useSearchParams()

  const selectTab = (tab: TabId) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    if (tab !== 'foreclosures') {
      params.delete('region')
      params.delete('miTab')
    }
    router.replace(`/dashboard?${params.toString()}`, { scroll: false })
  }

  return (
    <div
      className="sticky top-14 z-40 border-b overflow-x-auto"
      style={{ background: 'rgba(10,10,10,0.97)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}
    >
      <div className="flex gap-1 px-4 min-w-max">
        {TABS.map(tab => {
          const active = activeTab === tab.id
          const liveStyle = LIVE_STYLE_TABS.includes(tab.id)
          const badge =
            tab.id === 'saved' && saved.length > 0
              ? saved.length
              : tab.id === 'alerts' && alerts.filter(a => a.enabled).length > 0
                ? alerts.filter(a => a.enabled).length
                : null
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className="font-mono text-xs tracking-widest px-4 py-3 transition-all whitespace-nowrap flex items-center gap-2"
              style={{
                color: liveStyle
                  ? active
                    ? 'var(--gold)'
                    : undefined
                  : active
                    ? 'var(--gold)'
                    : 'var(--muted)',
                borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              {liveStyle ? (
                <>
                  <span className="live-indicator-dot" aria-hidden />
                  <span
                    className={
                      active ? 'live-tab-label live-tab-label--active' : 'live-tab-label'
                    }
                  >
                    {tab.label.toUpperCase()}
                  </span>
                </>
              ) : (
                tab.label.toUpperCase()
              )}
              {badge != null && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{ background: 'var(--gold-glow)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.25)' }}
                >
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
