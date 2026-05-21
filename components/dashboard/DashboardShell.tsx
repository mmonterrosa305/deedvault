'use client'

import { DashboardProvider, useDashboard } from '@/context/DashboardContext'
import DashboardTabNav from '@/components/dashboard/DashboardTabNav'
import SearchTab from '@/components/dashboard/SearchTab'
import SavedTab from '@/components/dashboard/SavedTab'
import AlertsTab from '@/components/dashboard/AlertsTab'
import AgentTab from '@/components/dashboard/AgentTab'
import SettingsTab from '@/components/dashboard/SettingsTab'
import LiveDataTab from '@/components/dashboard/LiveDataTab'
import ForeclosuresTab from '@/components/dashboard/ForeclosuresTab'

function DashboardContent() {
  const { activeTab } = useDashboard()
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

export default function DashboardShell() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  )
}
