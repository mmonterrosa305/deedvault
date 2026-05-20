'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

export type TabId = 'search' | 'saved' | 'alerts' | 'agent' | 'live' | 'settings'

export type SavedProperty = {
  listingId: string
  notes: string
  savedAt: string
}

export type AlertRule = {
  id: string
  name: string
  county: string
  state: string
  maxBid: number | null
  minBid: number | null
  propTypes: string[]
  auctionTypes: string[]
  enabled: boolean
  createdAt: string
}

const DEFAULT_ALERTS: AlertRule[] = [
  {
    id: 'alert-1',
    name: 'Miami-Dade under $50k',
    county: 'Miami-Dade',
    state: 'FL',
    maxBid: 50000,
    minBid: null,
    propTypes: [],
    auctionTypes: [],
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alert-2',
    name: 'Wayne County upcoming',
    county: 'Wayne',
    state: 'MI',
    maxBid: null,
    minBid: null,
    propTypes: ['Residential'],
    auctionTypes: ['Online', 'Live'],
    enabled: true,
    createdAt: new Date().toISOString(),
  },
]

type DashboardContextValue = {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  saved: SavedProperty[]
  isSaved: (listingId: string) => boolean
  toggleSave: (listingId: string) => void
  updateNotes: (listingId: string, notes: string) => void
  removeSaved: (listingId: string) => void
  alerts: AlertRule[]
  addAlert: (alert: Omit<AlertRule, 'id' | 'createdAt'>) => void
  updateAlert: (id: string, patch: Partial<AlertRule>) => void
  removeAlert: (id: string) => void
  toggleAlert: (id: string) => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('search')
  const [saved, setSaved] = useState<SavedProperty[]>([])
  const [alerts, setAlerts] = useState<AlertRule[]>(DEFAULT_ALERTS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setSaved(loadJson('deedvault_saved', []))
    const storedAlerts = loadJson<AlertRule[] | null>('deedvault_alerts', null)
    setAlerts(storedAlerts ?? DEFAULT_ALERTS)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('deedvault_saved', JSON.stringify(saved))
  }, [saved, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('deedvault_alerts', JSON.stringify(alerts))
  }, [alerts, hydrated])

  const isSaved = useCallback((listingId: string) => saved.some(s => s.listingId === listingId), [saved])

  const toggleSave = useCallback((listingId: string) => {
    setSaved(prev => {
      if (prev.some(s => s.listingId === listingId)) {
        return prev.filter(s => s.listingId !== listingId)
      }
      return [...prev, { listingId, notes: '', savedAt: new Date().toISOString() }]
    })
  }, [])

  const updateNotes = useCallback((listingId: string, notes: string) => {
    setSaved(prev => prev.map(s => (s.listingId === listingId ? { ...s, notes } : s)))
  }, [])

  const removeSaved = useCallback((listingId: string) => {
    setSaved(prev => prev.filter(s => s.listingId !== listingId))
  }, [])

  const addAlert = useCallback((alert: Omit<AlertRule, 'id' | 'createdAt'>) => {
    setAlerts(prev => [
      ...prev,
      { ...alert, id: `alert-${Date.now()}`, createdAt: new Date().toISOString() },
    ])
  }, [])

  const updateAlert = useCallback((id: string, patch: Partial<AlertRule>) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)))
  }, [])

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }, [])

  const toggleAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, enabled: !a.enabled } : a)))
  }, [])

  return (
    <DashboardContext.Provider
      value={{
        activeTab,
        setActiveTab,
        saved,
        isSaved,
        toggleSave,
        updateNotes,
        removeSaved,
        alerts,
        addAlert,
        updateAlert,
        removeAlert,
        toggleAlert,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
