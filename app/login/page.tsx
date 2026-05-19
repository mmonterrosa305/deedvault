'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password)
      const token = await user.getIdToken()

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!res.ok) {
        setError('Could not start session. Try again.')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed'
      setError(message.replace('Firebase: ', '').replace(/ \(auth\/[\w-]+\)\.?/, ''))
      setLoading(false)
    }
  }

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-4">

      {/* Logo top-left */}
      <div className="absolute top-6 left-8 flex items-center gap-2">
        <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: 'var(--gold)' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="#0a0a0a">
            <path d="M8 1L2 4v4c0 3.3 2.5 6.4 6 7.2C11.5 14.4 14 11.3 14 8V4L8 1zm0 2.2l4 2V8c0 2.4-1.8 4.6-4 5.4C5.8 12.6 4 10.4 4 8V5.2l4-2z"/>
          </svg>
        </div>
        <span className="font-display text-xl tracking-widest text-vault-text">
          DEED<span style={{ color: 'var(--gold)' }}>VAULT</span>
        </span>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-xs tracking-widest mb-3" style={{ color: 'var(--gold)' }}>
            TAX DEED INTELLIGENCE
          </p>
          <h1 className="font-display text-5xl tracking-wide text-vault-text leading-none">
            ACCESS<br />THE VAULT
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-3">

          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs tracking-widest" style={{ color: 'var(--muted)' }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs tracking-widest" style={{ color: 'var(--muted)' }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full"
            />
          </div>

          {error && (
            <p className="font-mono text-xs tracking-wide" style={{ color: '#e87a5a' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-11 w-full font-mono text-sm tracking-widest transition-all"
            style={{
              background: loading ? 'var(--gold-dim)' : 'var(--gold)',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-dm-mono)',
            }}
          >
            {loading ? 'UNLOCKING...' : 'ENTER VAULT'}
          </button>
        </form>

        {/* Divider line */}
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="font-mono text-xs text-center" style={{ color: 'var(--muted)' }}>
            FLORIDA &amp; MICHIGAN — 150 COUNTIES
          </p>
        </div>
      </div>
    </div>
  )
}
