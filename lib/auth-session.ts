import { jwtVerify, createRemoteJWKSet } from 'jose'

export const SESSION_COOKIE = 'deedvault_session'

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
)

export type SessionUser = {
  uid: string
  email: string
}

export async function verifyIdToken(token: string): Promise<SessionUser | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (!projectId) return null

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    })

    const email = typeof payload.email === 'string' ? payload.email : ''
    const uid = typeof payload.sub === 'string' ? payload.sub : ''
    if (!uid) return null

    return { uid, email }
  } catch {
    return null
  }
}
