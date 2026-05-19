import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifyIdToken, type SessionUser } from '@/lib/auth-session'

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifyIdToken(token)
}
