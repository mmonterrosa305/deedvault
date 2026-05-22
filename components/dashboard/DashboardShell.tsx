'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardProvider, useDashboard, type TabId } from '@/context/DashboardContext'
import DashboardTabNav from '@/components/dashboard/DashboardTabNav'
import SearchTab from '@/components/dashboard/SearchTab'
import SavedTab from '@/components/dashboard/SavedTab'
import AlertsTab from '@/components/dashboard/AlertsTab'
import AgentTab from '@/components/dashboard/AgentTab'
import SettingsTab from '@/components/dashboard/SettingsTab'
import LiveDataTab from '@/components/dashboard/LiveDataTab'
import ForeclosuresTab from '@/components/dashboard/ForeclosuresTab'

const VALID_TABS: TabId[] = [
  'search',
  'saved',
  'alerts',
  'agent',
  'live',
  'foreclosures',
  'settings',
]

function DashboardContent() {
  const { activeTab, setActiveTab } = useDashboard()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tab = searchParams.get('tab') as TabId | null
    if (tab && VALID_TABS.includes(tab) && tab !== activeTab) {
      setActiveTab(tab)
    }
  }, [searchParams, activeTab, setActiveTab])

  return (
    <>
      <DashboardTabNav />
      {activeTab === 'search' && <SearchTab />}
      {activeTab === 'saved' && <SavedTab />}
      {activeTab === 'alerts' && <AlertsTab />}
      {activeTab === 'agent' && <AgentTab />}
      {activeTab === 'live' && <LiveDataTab />}
      {activeTab === 'foreclosures' && <ForeclosuresTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </>
  )
}

function DashboardShellFallback() {
  return (
    <div className="px-4 py-16 text-center">
      <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
        Loading dashboard…
      </p>
    </div>
  )
}

export default function DashboardShell() {
  return (
    <DashboardProvider>
      <Suspense fallback={<DashboardShellFallback />}>
        <DashboardContent />
      </Suspense>
    </DashboardProvider>
  )
}
