import { NextResponse } from 'next/server'
import { SESSION_COOKIE, verifyIdToken } from '@/lib/auth-session'

const MAX_AGE = 60 * 60 * 24 * 5 // 5 days (Firebase ID tokens expire after 1h; client refreshes via re-login)

export async function POST(request: Request) {
  const { token } = await request.json()
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const user = await verifyIdToken(token)
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
