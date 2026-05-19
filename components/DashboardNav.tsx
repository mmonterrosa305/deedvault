'use client'

import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function DashboardNav({ email }: { email: string }) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/session', { method: 'DELETE' })
    await signOut(auth)
    router.push('/login')
    router.refresh()
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-14"
      style={{
        background: 'rgba(10,10,10,0.95)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gold)' }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="#0a0a0a">
            <path d="M8 1L2 4v4c0 3.3 2.5 6.4 6 7.2C11.5 14.4 14 11.3 14 8V4L8 1zm0 2.2l4 2V8c0 2.4-1.8 4.6-4 5.4C5.8 12.6 4 10.4 4 8V5.2l4-2z"/>
          </svg>
        </div>
        <span className="font-display text-lg tracking-widest">
          DEED<span style={{ color: 'var(--gold)' }}>VAULT</span>
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs hidden sm:block" style={{ color: 'var(--muted)' }}>
          {email}
        </span>
        <button
          onClick={handleLogout}
          className="font-mono text-xs tracking-widest px-3 py-1.5 transition-all"
          style={{
            border: '1px solid var(--border-bright)',
            borderRadius: '4px',
            color: 'var(--muted)',
            background: 'transparent',
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.color = 'var(--gold)'
            ;(e.target as HTMLButtonElement).style.borderColor = 'var(--gold-dim)'
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.color = 'var(--muted)'
            ;(e.target as HTMLButtonElement).style.borderColor = 'var(--border-bright)'
          }}
        >
          SIGN OUT
        </button>
      </div>
    </nav>
  )
}
